import type { Dispatch, MutableRefObject, ReactNode, RefObject, SetStateAction } from "react";
import type { FileType, PresenceUser, User } from "@/lib/types";
import {
  addLinkOverlayToPage,
  addTextOverlayToPage,
  computeTitle,
  resolveFileType,
} from "./file-page-utils";
import { buildFrontmatter, parseFrontmatter } from "@/lib/frontmatter";
import { useCallback, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useWsListener, wsClient } from "@/store/ws";
import type { PageMeta as DocMeta } from "@/lib/frontmatter";
import type { SaveStatus } from "./use-file-page-save";
import type { SlideThemeMap } from "@/lib/slide";
import { pathExtension } from "@/lib/filetypes";
import { toast } from "sonner";
import { useFilePageSave } from "./use-file-page-save";
import useMountEffect from "@/hooks/use-mount-effect";
import usePageActions from "@/hooks/use-page-actions";
import { useUser } from "@/store/user";

interface OutletCtx { autoSaveDelay: number; reloadTree: () => void }
interface UseFilePageReturn { breadcrumb: string[]; content: string; editLocked: PresenceUser | undefined; editMode: boolean; enterEdit: () => void; exitEdit: () => Promise<void>; exportPagePdf: () => Promise<void>; filePath: string; fileType: FileType; handleChange: (val: string) => void; handleEmojiChange: (newEmoji: string) => void; handlePageDuplicate: () => Promise<void>; handleSave: () => Promise<void>; infoOpen: boolean; lastSha: string | undefined; loadDoc: (path: string) => Promise<void>; loading: boolean; meta: DocMeta; metaRef: MutableRefObject<DocMeta>; notFound: boolean; openDelete: (filePath: string, title?: string) => void; openMove: (filePath: string) => Promise<void>; pageActionDialogs: ReactNode; pdfContentRef: RefObject<HTMLDivElement | null>; rawContent: string; rawExt: string; rawPath: string; remoteBanner: string | undefined; saveStatus: SaveStatus; setInfoOpen: Dispatch<SetStateAction<boolean>>; setMeta: Dispatch<SetStateAction<DocMeta>>; setRemoteBanner: Dispatch<SetStateAction<string | undefined>>; slideThemes: SlideThemeMap; title: string; user: User | undefined; viewers: PresenceUser[] }

function useFilePage(): UseFilePageReturn {
  const { "*": rawPath = "" } = useParams();
  const filePath = rawPath.includes(".") ? rawPath : `${rawPath}.md`;
  const navigate = useNavigate();
  const { reloadTree, autoSaveDelay } = useOutletContext<OutletCtx>();
  const { user, slideThemes } = useUser();

  const [editMode, setEditMode] = useState(false);
  const { content, doSave, handleChange, handleSave, isDirtyRef, lastSha, loadDoc, loading, meta, metaRef, notFound, rawContent, rawContentRef, savePromiseRef, saveStatus, setMeta } = useFilePageSave({ autoSaveDelay, filePath, reloadTree, setEditMode });

  const [editLocked, setEditLocked] = useState<PresenceUser | undefined>();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [infoOpen, setInfoOpen] = useState(
    () => localStorage.getItem("kumidocs:info-open") === "true",
  );
  const [remoteBanner, setRemoteBanner] = useState<string | undefined>();
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const { openMove, openDelete, dialogs: pageActionDialogs } = usePageActions(reloadTree);

  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  useMountEffect(() => {
    const handler = (ev: Event): void => {
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
    return (): void => {
      window.removeEventListener("kumidocs:open-info", handler);
    };
  });

  useMountEffect(() => {
    if (user) {
      wsClient.joinPage(filePath);
    }
    return (): void => {
      if (editModeRef.current) {
        wsClient.stopEditing(filePath);
      }
      wsClient.leavePage();
    };
  });

  useWsListener((msg) => {
    if (msg.type === "presence_update" && msg.pageId === filePath) {
      setViewers(msg.viewers);
      setEditLocked(msg.editor);
    }
    if (msg.type === "page_changed" && msg.pageId === filePath) {
      if (msg.changedBy === user?.id) {
        return;
      }
      if (isDirtyRef.current) {
        setRemoteBanner(`${msg.changedByName} saved this page remotely`);
      } else {
        void (async (): Promise<void> => {
          try {
            await loadDoc(filePath);
          } catch (error: unknown) {
            console.error("Failed to reload document after remote change:", error);
          }
        })();
        toast.info(`Page updated by ${msg.changedByName}`);
      }
    }
    if (msg.type === "page_deleted" && msg.pageId === filePath) {
      toast.warning("This page was deleted");
      navigate("/p/README.md");
    }
    if (msg.type === "save_conflict_lost" && msg.pageId === filePath) {
      toast.error("Your changes were lost due to a remote conflict.");
      void (async (): Promise<void> => {
        try {
          await loadDoc(filePath);
        } catch (error: unknown) {
          console.error("Failed to reload document after conflict:", error);
        }
      })();
    }
  });
  const rawExt = pathExtension(filePath);
  const fileType = resolveFileType(rawExt, meta.slides);
  const title = computeTitle(fileType, content, filePath);
  const breadcrumb = filePath.replace(/\.md$/u, "").split("/").slice(0, -1);

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
    await savePromiseRef.current;
    if (isDirtyRef.current) {
      await doSave(rawContentRef.current, true);
    }
    wsClient.stopEditing(filePath);
    setEditMode(false);
  }, [doSave, filePath, isDirtyRef, rawContentRef, savePromiseRef]);

  const handleEmojiChange = useCallback(
    (newEmoji: string) => {
      const newMeta = { ...metaRef.current, emoji: newEmoji };
      metaRef.current = newMeta;
      setMeta((prev) => ({ ...prev, emoji: newEmoji }));
      if (editModeRef.current) {
        const parsed = parseFrontmatter(rawContentRef.current);
        const newRaw = buildFrontmatter(newMeta) + parsed.content;
        void (async (): Promise<void> => {
          try {
            await doSave(newRaw, true);
          } catch (error: unknown) {
            console.error("Emoji save failed:", error);
          }
        })();
      } else {
        void (async (): Promise<void> => {
          try {
            await doSave(rawContentRef.current);
          } catch (error: unknown) {
            console.error("Emoji save failed:", error);
          }
        })();
      }
    },
    [doSave, metaRef, rawContentRef, setMeta],
  );

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
        body: JSON.stringify({ content: data.content, path: newPath }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
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
      const PAGE_H_PX = Math.floor((RENDER_W * 297) / 210);
      const rootRect = el.getBoundingClientRect();
      const canvas = await html2canvas(el, {
        logging: false,
        scale: SCALE,
        useCORS: true,
        width: RENDER_W,
      });
      const pdf = new jsPDF({ format: [RENDER_W, PAGE_H_PX], orientation: "portrait", unit: "px" });
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

  return {
    breadcrumb,
    content,
    editLocked,
    editMode,
    enterEdit,
    exitEdit,
    exportPagePdf,
    filePath,
    fileType,
    handleChange,
    handleEmojiChange,
    handlePageDuplicate,
    handleSave,
    infoOpen,
    lastSha,
    loadDoc,
    loading,
    meta,
    metaRef,
    notFound,
    openDelete,
    openMove,
    pageActionDialogs,
    pdfContentRef,
    rawContent,
    rawExt,
    rawPath,
    remoteBanner,
    saveStatus,
    setInfoOpen,
    setMeta,
    setRemoteBanner,
    slideThemes,
    title,
    user,
    viewers,
  };
}

export { useFilePage };
export type { OutletCtx };
