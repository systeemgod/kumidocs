import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { FileType, PresenceUser, User } from "../lib/types";
import { InfoRegular, MoreHorizontalRegular, SaveRegular } from "@fluentui/react-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { buildFrontmatter, extractHeadingTitle, parseFrontmatter } from "@/lib/frontmatter";
import { extensionToType, pathExtension } from "@/lib/filetypes";
import { useCallback, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useWsListener, wsClient } from "../store/ws";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { CodeEditor } from "../components/editor/CodeEditor";
import type { PageMeta as DocMeta } from "@/lib/frontmatter";
import { EmojiPickerPopover } from "../components/ui/EmojiPickerPopover";
import type { jsPDF as JsPDF } from "jspdf";
import { MarkdownEditor } from "../components/editor/MarkdownEditor";
import { MarkdownViewer } from "../components/editor/MarkdownViewer";
import { NotFound } from "./NotFound";
import { PageInfoPanel } from "../components/layout/PageInfoPanel";
import { PageMenuItems } from "../components/ui/PageMenuItems";
import type { ReactNode } from "react";
import { ScrollArea } from "../components/ui/scroll-area";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "../components/editor/SlideViewer";
import { UserAvatar } from "../components/ui/avatar";
import { toast } from "sonner";
import { useMountEffect } from "../hooks/useMountEffect";
import { usePageActions } from "../hooks/usePageActions";
import { useUser } from "../store/user";

interface OutletCtx {
  reloadTree: () => void;
  autoSaveDelay: number;
}
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

// Derive a nice title from the file path
function pathToTitle(path: string): string {
  return (path.split("/").pop() ?? path)
    .replace(/\.md$/u, "")
    .replaceAll(/[-_]/gu, " ")
    .replaceAll(/\b\w/gu, (char) => char.toUpperCase());
}

// ── PDF overlay helpers (extracted to keep exportPagePdf complexity in check) ──

function addTextOverlayToPage(
  pdf: JsPDF,
  el: HTMLElement,
  rootRect: DOMRect,
  pageHPx: number,
): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replaceAll(/\s+/gu, " ").trim();
    if (!text || !(node as Text).parentElement) {
      continue;
    }
    let ancestor: Element | null = (node as Text).parentElement;
    let inSvg = false;
    while (ancestor) {
      if (ancestor.tagName.toLowerCase() === "svg") {
        inSvg = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (inSvg) {
      continue;
    }
    const range = document.createRange();
    range.selectNode(node);
    const br = range.getBoundingClientRect();
    if (br.width <= 0 || br.height <= 0) {
      continue;
    }
    const yLocal = br.top - rootRect.top;
    const pageIdx = Math.floor(yLocal / pageHPx);
    const yOnPage = yLocal - pageIdx * pageHPx;
    const fsPx = Number.parseFloat(
      window.getComputedStyle((node as Text).parentElement ?? document.body).fontSize,
    );
    pdf.setPage(pageIdx + 1);
    pdf.setFontSize(Number.isNaN(fsPx) ? 12 : fsPx);
    const pdfWidth = pdf.getTextWidth(text);
    const charSpace = text.length > 1 ? (br.width - pdfWidth) / (text.length - 1) : 0;
    pdf.setCharSpace(charSpace);
    pdf.text(text, br.left - rootRect.left, yOnPage, {
      renderingMode: "invisible",
      baseline: "top",
    });
    pdf.setCharSpace(0);
  }
}

function addLinkOverlayToPage(
  pdf: JsPDF,
  el: HTMLElement,
  rootRect: DOMRect,
  pageHPx: number,
): void {
  for (const anchor of el.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const rect = anchor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }
    const xPos = rect.left - rootRect.left;
    const yLocal = rect.top - rootRect.top;
    const pageIdx = Math.floor(yLocal / pageHPx);
    const yOnPage = yLocal - pageIdx * pageHPx;
    if (xPos < 0 || yOnPage < 0) {
      continue;
    }
    pdf.setPage(pageIdx + 1);
    pdf.link(xPos, yOnPage, rect.width, rect.height, { url: anchor.href });
  }
}

// ── Derived-value helpers ─────────────────────────────────────────────────────

function resolveFileType(rawExt: string, slides: boolean | undefined): FileType {
  const base = extensionToType(rawExt);
  return base === "doc" && slides ? "slide" : base;
}

function computeTitle(fileType: FileType, content: string, filePath: string): string {
  if (fileType === "doc" || fileType === "slide") {
    return extractHeadingTitle(content) ?? pathToTitle(filePath);
  }
  return filePath.split("/").pop() ?? filePath;
}

function getEditButtonClass(
  editMode: boolean,
  editLocked: PresenceUser | undefined,
  user: User | undefined,
): string {
  if (editMode) {
    return "bg-background text-foreground shadow-sm";
  }
  if (editLocked && user && editLocked.id !== user.id) {
    return "text-muted-foreground opacity-40 cursor-not-allowed";
  }
  return "text-muted-foreground hover:text-foreground";
}

function getSaveBadgeClass(saveStatus: SaveStatus): string {
  if (saveStatus === "saved") {
    return " border-green-600 text-green-600 dark:border-green-500 dark:text-green-500";
  }
  if (saveStatus === "error") {
    return " border-destructive text-destructive";
  }
  return "";
}

const SAVE_BADGE_TEXT: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved",
  error: "Error",
};

interface EditorContentProps {
  fileType: FileType;
  editMode: boolean;
  content: string;
  rawContent: string;
  rawExt: string;
  handleChange: (val: string) => void;
  handleSave: () => Promise<void>;
  meta: DocMeta;
  slideThemes: SlideThemeMap;
  setMeta: React.Dispatch<React.SetStateAction<DocMeta>>;
  metaRef: React.MutableRefObject<DocMeta>;
  title: string;
}

function buildEditorContent({
  fileType,
  editMode,
  content,
  rawContent,
  rawExt,
  handleChange,
  handleSave,
  meta,
  slideThemes,
  setMeta,
  metaRef,
  title,
}: EditorContentProps): ReactNode {
  if (fileType === "code") {
    return (
      <CodeEditor
        value={content}
        language={rawExt}
        readOnly={!editMode}
        onChange={editMode ? handleChange : undefined}
        onSave={editMode ? handleSave : undefined}
      />
    );
  }
  if (editMode) {
    return (
      <MarkdownEditor
        value={rawContent}
        onChange={handleChange}
        onSave={handleSave}
        fileType={fileType}
        slideTheme={meta.theme}
        slidePaginate={meta.paginate}
        slideThemes={slideThemes}
        slideThemeVars={meta.themeVars}
        onMetaChange={(updatedMeta) => {
          metaRef.current = updatedMeta;
          setMeta(updatedMeta);
        }}
      />
    );
  }
  if (fileType === "slide") {
    return (
      <SlideViewer
        value={content}
        filename={title}
        theme={meta.theme}
        paginate={meta.paginate}
        slideThemes={slideThemes}
        themeVars={meta.themeVars}
      />
    );
  }
  return (
    <ScrollArea className="h-full">
      <MarkdownViewer value={content} />
    </ScrollArea>
  );
}

// ── Page header sub-component ─────────────────────────────────────────────────

interface FilePageHeaderProps {
  meta: DocMeta;
  fileType: FileType;
  title: string;
  user: User | undefined;
  editMode: boolean;
  editLocked: PresenceUser | undefined;
  viewers: PresenceUser[];
  saveStatus: SaveStatus;
  infoOpen: boolean;
  rawPath: string;
  filePath: string;
  handleEmojiChange: (emoji: string) => void;
  exitEdit: () => Promise<void>;
  enterEdit: () => void;
  setInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handlePageDuplicate: () => void;
  exportPagePdf: () => void;
  openMove: (path: string) => Promise<void>;
  openDelete: () => void;
}

function FilePageHeader({
  meta,
  fileType,
  title,
  user,
  editMode,
  editLocked,
  viewers,
  saveStatus,
  infoOpen,
  rawPath,
  filePath,
  handleEmojiChange,
  exitEdit,
  enterEdit,
  setInfoOpen,
  handlePageDuplicate,
  exportPagePdf,
  openMove,
  openDelete,
}: FilePageHeaderProps) {
  const editButtonClass = getEditButtonClass(editMode, editLocked, user);
  const saveBadgeClass = getSaveBadgeClass(saveStatus);
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
      {/* Left: icon + title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <EmojiPickerPopover
          emoji={meta.emoji}
          fileType={fileType}
          size={24}
          editable={editMode}
          onSelect={handleEmojiChange}
        />
        <h1 className="font-semibold text-base truncate">{title}</h1>
      </div>

      {/* Center: Read/Edit segmented switch */}
      {user?.canEdit && (
        <div
          className="flex items-center rounded-md border border-border bg-muted h-7 p-0.5 gap-0.5 shrink-0"
          title={
            editLocked && editLocked.id !== user.id ? `${editLocked.name} is editing` : undefined
          }
        >
          <button
            className={`h-6 px-2.5 rounded text-xs transition-colors select-none ${!editMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={async () => {
              if (editMode) {
                try {
                  await exitEdit();
                } catch (error: unknown) {
                  console.error("Failed to exit edit mode:", error);
                }
              }
            }}
          >
            Read
          </button>
          <button
            className={`h-6 px-2.5 rounded text-xs transition-colors select-none ${editButtonClass}`}
            onClick={() => {
              if (!editMode && !(editLocked && editLocked.id !== user.id)) {
                enterEdit();
              }
            }}
            disabled={editMode || Boolean(editLocked && editLocked.id !== user.id)}
          >
            Edit
          </button>
        </div>
      )}

      {/* Save status – inline next to Edit button */}
      {editMode && (
        <Badge variant="outline" className={`text-xs h-5 shrink-0${saveBadgeClass}`}>
          {SAVE_BADGE_TEXT[saveStatus]}
        </Badge>
      )}

      {/* Right: viewers + info + dropdown */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        {/* Viewers — deduplicated by id (same user may have multiple tabs open) */}
        <div className="flex -space-x-1">
          {[...new Map(viewers.map((viewer) => [viewer.id, viewer])).values()]
            .slice(0, 5)
            .map((viewer) => (
              <Tooltip key={viewer.id}>
                <TooltipTrigger asChild>
                  <UserAvatar
                    name={viewer.name}
                    email={viewer.email}
                    size="sm"
                    className="border border-background ring-1 ring-border"
                  />
                </TooltipTrigger>
                <TooltipContent>{viewer.name}</TooltipContent>
              </Tooltip>
            ))}
        </div>

        {/* Dedicated info button */}
        {!editMode && (
          <Button
            size="sm"
            variant={infoOpen ? "secondary" : "ghost"}
            className="h-7 gap-1 text-xs px-2"
            onClick={() => {
              setInfoOpen((prev) => {
                const next = !prev;
                if (next) {
                  localStorage.setItem("kumidocs:info-open", "true");
                } else {
                  localStorage.removeItem("kumidocs:info-open");
                }
                return next;
              });
            }}
          >
            <InfoRegular className="w-4 h-4" />
            Info
          </Button>
        )}

        {/* Advanced / dangerous actions only */}
        {user?.canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreHorizontalRegular className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <PageMenuItems
                variant="dropdown"
                href={`/p/${rawPath}`}
                path={filePath}
                displayTitle={title}
                onDuplicate={handlePageDuplicate}
                onExportPdf={fileType === "doc" && !editMode ? exportPagePdf : undefined}
                onMove={async (movePath) => {
                  try {
                    await openMove(movePath);
                  } catch (error: unknown) {
                    console.error("Failed to open move dialog:", error);
                  }
                }}
                onDelete={openDelete}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function FilePage() {
  const { "*": rawPath = "" } = useParams();
  const filePath = !rawPath.includes(".") ? `${rawPath}.md` : rawPath; // default to .md if no extension

  const navigate = useNavigate();
  const { reloadTree, autoSaveDelay } = useOutletContext<OutletCtx>();
  const { user, slideThemes } = useUser();

  const [content, setContent] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [savedContent, setSavedContent] = useState("");

  const [meta, setMeta] = useState<DocMeta>({});
  const [editMode, setEditMode] = useState(false);
  const [editLocked, setEditLocked] = useState<PresenceUser | undefined>();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSha, setLastSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Shared move/delete actions (dialogs rendered at bottom of JSX)
  const { openMove, openDelete, dialogs: pageActionDialogs } = usePageActions(reloadTree);

  // Modals
  const [infoOpen, setInfoOpen] = useState(
    () => localStorage.getItem("kumidocs:info-open") === "true",
  );
  const [remoteBanner, setRemoteBanner] = useState<string | undefined>();
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Toggle info panel from sidebar context menu (same-tab custom event)
  useMountEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (detail === filePath) {
        setInfoOpen((prev) => {
          const next = !prev;
          if (next) {
            localStorage.setItem("kumidocs:info-open", "true");
          } else {
            localStorage.removeItem("kumidocs:info-open");
          }
          return next;
        });
      }
    };
    window.addEventListener("kumidocs:open-info", handler);
    return () => {
      window.removeEventListener("kumidocs:open-info", handler);
    };
  });

  const autoSaveTimer = useRef(undefined as ReturnType<typeof setTimeout> | undefined);
  // Clear the auto-save timer on unmount to prevent a save firing on a dead component.
  useMountEffect(() => () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
  });
  // Mutex: chain saves so they never run concurrently (prevents double-commit 409)
  const savePromiseRef = useRef<Promise<void>>(Promise.resolve());
  // Explicit dirty flag — set true on any content change, false when a save succeeds.
  // More reliable than comparing content strings (which can have whitespace/newline
  // differences introduced by matter.stringify round-tripping).
  const isDirtyRef = useRef(false);
  // Keep a ref to latest content so exitEdit/auto-save always read the latest value
  const contentRef = useRef(content);
  contentRef.current = content;
  const rawContentRef = useRef(rawContent);
  rawContentRef.current = rawContent;
  const savedContentRef = useRef(savedContent);
  savedContentRef.current = savedContent;
  // Keep a ref to latest meta so doSave always writes the current emoji/marp flag
  const metaRef = useRef(meta);
  metaRef.current = meta;

  // Load document
  const loadDoc = useCallback(async (path: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        content: string;
        sha: string;
      };
      const parsed = parseFrontmatter(data.content);
      setContent(parsed.content);
      setRawContent(data.content);
      setSavedContent(parsed.content);
      isDirtyRef.current = false;
      setMeta(parsed.data);
      setLastSha(data.sha);
      setSaveStatus("saved");
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useMountEffect(() => {
    void (async () => {
      try {
        await loadDoc(filePath);
      } catch (error: unknown) {
        console.error("Failed to load document:", error);
      }
    })();
  });

  // Track editMode in a ref so the cleanup can read the latest value
  // without adding editMode to the effect deps (which would re-run joinPage on every keystroke).
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  // Tell server which page we're on; clean up presence when navigating away or unmounting.
  useMountEffect(() => {
    if (user) {
      wsClient.joinPage(filePath);
    }
    return () => {
      if (editModeRef.current) {
        wsClient.stopEditing(filePath);
      }
      wsClient.leavePage();
    };
  });

  // WS events
  useWsListener((msg) => {
    if (msg.type === "presence_update" && msg.pageId === filePath) {
      setViewers(msg.viewers);
      setEditLocked(msg.editor);
    }
    if (msg.type === "page_changed" && msg.pageId === filePath) {
      // Ignore echoes of our own saves — the server broadcasts to all
      // clients including the sender, but we've already applied the change.
      if (msg.changedBy === user?.id) {
        return;
      }
      if (!isDirtyRef.current) {
        void (async () => {
          try {
            await loadDoc(filePath);
          } catch (error: unknown) {
            console.error("Failed to reload document after remote change:", error);
          }
        })();
        toast.info(`Page updated by ${msg.changedByName}`);
      } else {
        setRemoteBanner(`${msg.changedByName} saved this page remotely`);
      }
    }
    if (msg.type === "page_deleted" && msg.pageId === filePath) {
      toast.warning("This page was deleted");
      navigate("/p/README.md");
    }
    if (msg.type === "save_conflict_lost" && msg.pageId === filePath) {
      toast.error("Your changes were lost due to a remote conflict.");
      void (async () => {
        try {
          await loadDoc(filePath);
        } catch (error: unknown) {
          console.error("Failed to reload document after conflict:", error);
        }
      })();
    }
  });

  // Save function — serialised via savePromiseRef so two saves never run concurrently.
  // Concurrent saves (e.g. auto-save fires + user presses Done simultaneously) would
  // produce two git commits on the same file, causing the second one to 409-conflict.
  const doSave = useCallback(
    (currentContent: string, isRaw = false): Promise<void> => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = undefined;
      }
      // Chain behind any in-flight save
      const prev = savePromiseRef.current;
      const next: Promise<void> = (async () => {
        // Swallow errors from the previous save so one failure doesn't stall the queue.
        try {
          await prev;
        } catch {
          /* intentionally empty — previous save errors must not block the queue */
        }
        setSaveStatus("saving");

        // In raw mode the content already contains the full frontmatter block.
        // Otherwise reconstruct frontmatter from whitelisted fields only.
        const fullContent = isRaw
          ? currentContent
          : buildFrontmatter(metaRef.current) + currentContent;

        try {
          const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: fullContent }),
          });
          if (res.ok) {
            const data = (await res.json()) as { sha: string; pushWarning?: boolean };
            if (isRaw) {
              // Re-parse to keep content + meta in sync for view mode.
              const parsed = parseFrontmatter(currentContent);
              setContent(parsed.content);
              setSavedContent(parsed.content);
              savedContentRef.current = parsed.content;
              setMeta(parsed.data);
              metaRef.current = parsed.data;
            } else {
              setSavedContent(currentContent);
              savedContentRef.current = currentContent;
            }
            isDirtyRef.current = false; // mark clean immediately
            setSaveStatus("saved");
            setLastSha(data.sha);
            reloadTree();
            if (data.pushWarning) {
              toast.warning("Saved locally. Remote push failed — check git remote config.");
            }
          } else {
            setSaveStatus("error");
            toast.error("Save failed.");
          }
        } catch {
          setSaveStatus("error");
          toast.error("Save failed — network error.");
        }
      })();
      savePromiseRef.current = next;
      return next;
    },
    [filePath, reloadTree],
  );

  // Handle content changes
  const handleChange = useCallback(
    (val: string) => {
      setRawContent(val);
      rawContentRef.current = val;
      setSaveStatus("unsaved");
      isDirtyRef.current = true; // mark dirty immediately
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = setTimeout(async () => {
        try {
          await doSave(val, true);
        } catch (error: unknown) {
          console.error("Auto-save failed:", error);
        }
      }, autoSaveDelay);
    },
    [doSave, autoSaveDelay],
  );

  // Ctrl+S
  const handleSave = useCallback(async () => {
    try {
      await doSave(rawContentRef.current, true);
    } catch (error: unknown) {
      console.error("Manual save failed:", error);
    }
  }, [doSave]);

  // Emoji change (edit mode only) — update meta and persist immediately
  const handleEmojiChange = useCallback(
    (newEmoji: string) => {
      // Update the ref synchronously so the save below picks up the new emoji.
      const newMeta = { ...metaRef.current, emoji: newEmoji };
      metaRef.current = newMeta;
      setMeta((prev) => ({ ...prev, emoji: newEmoji }));
      if (editModeRef.current) {
        // In raw edit mode: rebuild the frontmatter block inside rawContent.
        const parsed = parseFrontmatter(rawContentRef.current);
        const newRaw = buildFrontmatter(newMeta) + parsed.content;
        setRawContent(newRaw);
        rawContentRef.current = newRaw;
        void (async () => {
          try {
            await doSave(newRaw, true);
          } catch (error: unknown) {
            console.error("Emoji save failed:", error);
          }
        })();
      } else {
        // Persist the emoji change immediately (chains behind any in-flight save).
        void (async () => {
          try {
            await doSave(contentRef.current);
          } catch (error: unknown) {
            console.error("Emoji save failed:", error);
          }
        })();
      }
    },
    [doSave],
  );

  // Edit mode toggle
  const enterEdit = useCallback(() => {
    if (!user?.canEdit) {
      return;
    }
    if (editLocked && editLocked.id !== user.id) {
      toast.warning(`${editLocked.name} is currently editing this page.`);
      return;
    }
    wsClient.startEditing(filePath);
    setEditMode(true);
  }, [user, editLocked, filePath]);

  const exitEdit = useCallback(async () => {
    // Drain any in-flight save first, then check the explicit dirty flag.
    // isDirtyRef is set true on every keystroke and false immediately when a save
    // succeeds — so it's always accurate regardless of React render scheduling.
    await savePromiseRef.current;
    if (isDirtyRef.current) {
      await doSave(rawContentRef.current, true);
    }
    wsClient.stopEditing(filePath);
    setEditMode(false);
  }, [doSave, filePath]);

  const rawExt = pathExtension(filePath);
  const fileType = resolveFileType(rawExt, meta.slides);
  const title = computeTitle(fileType, content, filePath);

  const handlePageDuplicate = useCallback(async () => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) {
        toast.error("Duplicate failed");
        return;
      }
      const data = (await res.json()) as { content: string };
      const newPath = `${filePath.replace(/\.md$/iu, "")}-copy.md`;
      const saveRes = await fetch("/api/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, content: data.content }),
      });
      if (saveRes.ok) {
        reloadTree();
        toast.success("Page duplicated");
        navigate(`/p/${newPath}`);
      } else if (saveRes.status === 409) {
        toast.error("A copy already exists at that path");
      } else {
        toast.error("Duplicate failed");
      }
    } catch {
      toast.error("Duplicate failed");
    }
  }, [filePath, navigate, reloadTree]);

  const exportPagePdf = useCallback(async () => {
    if (isPdfExporting) {
      return;
    }
    setIsPdfExporting(true);
    try {
      const el = pdfContentRef.current;
      if (!el) {
        return;
      }
      const { default: html2canvas } = await import("html2canvas-pro");
      const { jsPDF } = await import("jspdf");
      const RENDER_W = 800;
      const SCALE = 1.5;
      const PAGE_H_PX = Math.floor((RENDER_W * 297) / 210); // A4 portrait ratio ≈ 1131px
      const rootRect = el.getBoundingClientRect();
      const canvas = await html2canvas(el, {
        width: RENDER_W,
        scale: SCALE,
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [RENDER_W, PAGE_H_PX],
      });
      const totalH = canvas.height;
      const scaledPageH = PAGE_H_PX * SCALE;
      let yOffset = 0;
      while (yOffset < totalH) {
        const sliceH = Math.min(scaledPageH, totalH - yOffset);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(sliceH);
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, -yOffset);
        }
        if (yOffset > 0) {
          pdf.addPage();
        }
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, RENDER_W, sliceH / SCALE);
        yOffset += scaledPageH;
      }

      addTextOverlayToPage(pdf, el, rootRect, PAGE_H_PX);
      addLinkOverlayToPage(pdf, el, rootRect, PAGE_H_PX);

      pdf.save(`${title}.pdf`);
    } finally {
      setIsPdfExporting(false);
    }
  }, [isPdfExporting, title]);

  // Breadcrumb
  const breadcrumb = filePath.replace(/\.md$/u, "").split("/").slice(0, -1);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  const editorContent = buildEditorContent({
    fileType,
    editMode,
    content,
    rawContent,
    rawExt,
    handleChange,
    handleSave,
    meta,
    slideThemes,
    setMeta,
    metaRef,
    title,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Remote change banner */}
      {remoteBanner && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <span className="flex-1">{remoteBanner} while you have unsaved changes.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={async () => {
              try {
                await loadDoc(filePath);
              } catch (error: unknown) {
                console.error("Failed to reload document:", error);
              }
              setRemoteBanner(undefined);
            }}
          >
            Reload
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => {
              setRemoteBanner(undefined);
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Page header */}
      <FilePageHeader
        meta={meta}
        fileType={fileType}
        title={title}
        user={user}
        editMode={editMode}
        editLocked={editLocked}
        viewers={viewers}
        saveStatus={saveStatus}
        infoOpen={infoOpen}
        rawPath={rawPath}
        filePath={filePath}
        handleEmojiChange={handleEmojiChange}
        exitEdit={exitEdit}
        enterEdit={enterEdit}
        setInfoOpen={setInfoOpen}
        handlePageDuplicate={() => {
          void handlePageDuplicate();
        }}
        exportPagePdf={() => {
          void exportPagePdf();
        }}
        openMove={openMove}
        openDelete={() => {
          openDelete(filePath);
        }}
      />

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="px-4 py-0.5 text-xs text-muted-foreground border-b border-border shrink-0">
          {breadcrumb.join(" / ")}
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">{editorContent}</div>
        {infoOpen && !editMode && (
          <PageInfoPanel
            key={filePath}
            filePath={filePath}
            title={title}
            onClose={() => {
              setInfoOpen(false);
              localStorage.removeItem("kumidocs:info-open");
            }}
          />
        )}
      </div>

      {/* Footer */}
      {lastSha && (
        <div className="px-4 py-1 border-t border-border text-xs text-muted-foreground shrink-0 flex items-center gap-2">
          <SaveRegular className="w-3 h-3" />
          <span>
            Last saved · <code className="font-mono">{lastSha}</code>
          </span>
        </div>
      )}

      {/* Off-screen render container for PDF export */}
      {fileType === "doc" && (
        <div
          ref={pdfContentRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: 800,
            zIndex: -9999,
            pointerEvents: "none",
          }}
        >
          <MarkdownViewer value={content} />
        </div>
      )}

      {/* Move + Delete dialogs (shared hook) */}
      {pageActionDialogs}
    </div>
  );
}
