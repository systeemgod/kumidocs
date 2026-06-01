import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { FileType, PresenceUser, User } from "@/lib/types";
import CodeEditor from "@/components/editor/code-editor";
import type { PageMeta as DocMeta } from "@/lib/frontmatter";
import type { jsPDF as JsPDF } from "jspdf";
import MarkdownEditor from "@/components/editor/markdown-editor";
import MarkdownViewer from "@/components/editor/markdown-viewer";
import type { SaveStatus } from "./use-file-page-save";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "@/components/editor/slide-viewer";
import { extensionToType } from "@/lib/filetypes";
import { extractHeadingTitle } from "@/lib/frontmatter";

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
    if (!text || !(node instanceof Text) || node.parentElement === null) {
      continue;
    }
    let ancestor: Element | null = node.parentElement;
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
    const fsPx = Number.parseFloat(window.getComputedStyle(node.parentElement).fontSize);
    pdf.setPage(pageIdx + 1);
    pdf.setFontSize(Number.isNaN(fsPx) ? 12 : fsPx);
    const pdfWidth = pdf.getTextWidth(text);
    const charSpace = text.length > 1 ? (br.width - pdfWidth) / (text.length - 1) : 0;
    pdf.setCharSpace(charSpace);
    pdf.text(text, br.left - rootRect.left, yOnPage, {
      baseline: "top",
      renderingMode: "invisible",
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
  return base === "doc" && slides === true ? "slide" : base;
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
  error: "Error",
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved",
};

interface EditorContentProps {
  fileType: FileType;
  editMode: boolean;
  content: string;
  /** Wiki-link-resolved markdown (view mode only). Falls back to `content` if undefined. */
  resolvedContent?: string;
  rawContent: string;
  rawExt: string;
  handleChange: (val: string) => void;
  handleSave: () => Promise<void>;
  meta: DocMeta;
  slideThemes: SlideThemeMap;
  setMeta: Dispatch<SetStateAction<DocMeta>>;
  metaRef: RefObject<DocMeta>;
  title: string;
}

function buildEditorContent({
  fileType,
  editMode,
  content,
  resolvedContent,
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
  // Use wiki-link-resolved content in view mode when available
  const viewContent = resolvedContent ?? content;
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
        value={viewContent}
        filename={title}
        theme={meta.theme}
        paginate={meta.paginate}
        header={meta.header}
        footer={meta.footer}
        slideThemes={slideThemes}
        themeVars={meta.themeVars}
      />
    );
  }
  return (
    <ScrollArea className="h-full">
      <MarkdownViewer value={viewContent} />
    </ScrollArea>
  );
}

export type { PresenceUser, User, SaveStatus, DocMeta, SlideThemeMap };
export {
  pathToTitle,
  addTextOverlayToPage,
  addLinkOverlayToPage,
  resolveFileType,
  computeTitle,
  getEditButtonClass,
  getSaveBadgeClass,
  SAVE_BADGE_TEXT,
  buildEditorContent,
};
