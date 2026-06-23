import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { FileType, PresenceUser, User } from "@/lib/types";
import CodeEditor from "@/components/editor/markdown/code-editor";
import type { PageMeta as DocMeta } from "@/lib/frontmatter";
import MarkdownEditor from "@/components/editor/markdown/editor";
import MarkdownViewer from "@/components/editor/markdown/viewer";
import type { SaveStatus } from "./use-save";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "@/components/editor/slides/viewer";
import { addOverlayToPdf } from "@/components/editor/slides/utils";
import { extensionToType } from "@/lib/filetypes";
import { extractHeadingTitle } from "@/lib/frontmatter";

function pathToTitle(path: string): string {
  return (path.split("/").pop() ?? path)
    .replace(/\.md$/u, "")
    .replaceAll(/[-_]/gu, " ")
    .replaceAll(/\b\w/gu, (char) => char.toUpperCase());
}

// Derived-value helpers

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

/** Check if markdown content has no meaningful text (only frontmatter and headings). */
function isContentEmpty(content: string): boolean {
  const body = content
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\r?\n/u, "")
    // Remove heading lines
    .replace(/^#{1,6}\s+.*$/mu, "")
    // Remove empty lines and whitespace
    .replaceAll(/\s+/gu, "");
  return body.length === 0;
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
      <MarkdownViewer
        value={isContentEmpty(content) ? `${viewContent}\n\n[!PAGES]` : viewContent}
      />
    </ScrollArea>
  );
}

export type { PresenceUser, User, SaveStatus, DocMeta, SlideThemeMap };
export {
  pathToTitle,
  addOverlayToPdf,
  resolveFileType,
  computeTitle,
  getEditButtonClass,
  getSaveBadgeClass,
  SAVE_BADGE_TEXT,
  buildEditorContent,
};
