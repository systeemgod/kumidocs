import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  HEADING_OPTIONS,
  insertImage,
  insertLink,
  insertWrap,
  setLinePrefix,
  toggleListPrefix,
  uploadImageFile,
} from "./markdown-editor-utils";
import { buildFrontmatter, parseFrontmatter } from "@/lib/frontmatter";
import { useCallback, useMemo, useRef, useState } from "react";
import { BUILTIN_SLIDE_THEMES } from "@/lib/slide";
import type { PageMeta } from "@/lib/frontmatter";
import type { SlideThemeMap } from "@/lib/slide";
import { toast } from "sonner";

interface UseMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  slideThemes?: SlideThemeMap;
  onMetaChange?: (meta: PageMeta) => void;
}

interface UseMarkdownEditorReturn { applyMeta: (newMeta: PageMeta) => void; dlgMeta: PageMeta; fileInputRef: RefObject<HTMLInputElement | null>; handleBold: () => void; handleCode: () => void; handleDragOver: (ev: React.DragEvent) => void; handleDrop: (ev: React.DragEvent) => void; handleEditorScroll: (ev: React.UIEvent<HTMLTextAreaElement>) => void; handleHeading: (val: string) => void; handleImageFiles: (files: FileList | File[]) => void; handleItalic: () => void; handleKeyDown: (ev: React.KeyboardEvent<HTMLTextAreaElement>) => void; handleLink: () => void; handleNumbered: () => void; handlePropsOpen: (open: boolean) => void; handleQuote: () => void; handleStrikethrough: () => void; handleTask: () => void; handleUnordered: () => void; headingValue: string; helpOpen: boolean; previewRef: RefObject<HTMLDivElement | null>; previewValue: string; propsOpen: boolean; saveSelection: () => void; setHelpOpen: Dispatch<SetStateAction<boolean>>; setShowPreview: Dispatch<SetStateAction<boolean>>; showPreview: boolean; taRef: RefObject<HTMLTextAreaElement | null>; themeOptions: string[] }

function useMarkdownEditor({
  value,
  onChange,
  onSave,
  slideThemes,
  onMetaChange,
}: UseMarkdownEditorProps): UseMarkdownEditorReturn {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headingValue, setHeadingValue] = useState("normal");
  const [helpOpen, setHelpOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [propsOpen, setPropsOpen] = useState(false);
  const [dlgMeta, setDlgMeta] = useState<PageMeta>({});
  // Strip frontmatter from value for the preview pane (textarea shows full raw content).
  const previewValue = useMemo(() => parseFrontmatter(value).content, [value]);
  // Available theme names for the properties dialog.
  const themeOptions = useMemo(() => {
    const builtin = Object.keys(BUILTIN_SLIDE_THEMES);
    const custom = slideThemes
      ? Object.keys(slideThemes).filter((key) => !builtin.includes(key))
      : [];
    return ["default", ...builtin, ...custom];
  }, [slideThemes]);
  // Track the last known cursor/selection so toolbar actions that steal focus
  // (especially the heading Select dropdown) still operate at the right position.
  const savedSelectionRef = useRef({ end: 0, start: 0 });
  const saveSelection = useCallback(() => {
    if (taRef.current) {
      savedSelectionRef.current = {
        end: taRef.current.selectionEnd,
        start: taRef.current.selectionStart,
      };
    }
  }, []);

  // Dispatch a synthetic change so React picks up imperative textarea edits.
  const syncChange = useCallback(() => {
    if (taRef.current) {
      onChange(taRef.current.value);
    }
  }, [onChange]);

  const handlePropsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setDlgMeta(parseFrontmatter(value).data);
      }
      setPropsOpen(open);
    },
    [value],
  );

  const applyMeta = useCallback(
    (newMeta: PageMeta) => {
      setDlgMeta(newMeta);
      const body = parseFrontmatter(value).content;
      const newRaw = buildFrontmatter(newMeta) + body;
      onChange(newRaw);
      onMetaChange?.(newMeta);
    },
    [value, onChange, onMetaChange],
  );

  const handleHeading = useCallback(
    (val: string) => {
      setHeadingValue(val);
      const opt = HEADING_OPTIONS.find((option) => option.value === val);
      if (!opt || !taRef.current) {
        return;
      }
      const ta = taRef.current;
      // Restore the saved selection: the dropdown stole focus and may have
      // caused the browser or React to reset the textarea cursor position.
      ta.focus();
      ta.setSelectionRange(savedSelectionRef.current.start, savedSelectionRef.current.end);
      setLinePrefix(ta, opt.prefix ? `${opt.prefix} ` : "");
      syncChange();
    },
    [syncChange],
  );

  const handleBold = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    insertWrap(taRef.current, "**", "**");
    syncChange();
  }, [syncChange]);

  const handleItalic = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    insertWrap(taRef.current, "*", "*");
    syncChange();
  }, [syncChange]);

  const handleStrikethrough = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    insertWrap(taRef.current, "~~", "~~");
    syncChange();
  }, [syncChange]);

  const handleCode = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    insertWrap(taRef.current, "`", "`");
    syncChange();
  }, [syncChange]);

  const handleLink = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    insertLink(taRef.current);
    syncChange();
  }, [syncChange]);

  const handleQuote = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    setLinePrefix(taRef.current, "> ");
    syncChange();
  }, [syncChange]);

  const handleUnordered = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    toggleListPrefix(taRef.current, "- ");
    syncChange();
  }, [syncChange]);

  const handleNumbered = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    toggleListPrefix(taRef.current, "1. ");
    syncChange();
  }, [syncChange]);

  const handleTask = useCallback(() => {
    if (!taRef.current) {
      return;
    }
    toggleListPrefix(taRef.current, "- [ ] ");
    syncChange();
  }, [syncChange]);

  const handleImageFiles = useCallback(
    (files: FileList | File[]) => {
      const images = [...files].filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) {
        return;
      }
      const ta = taRef.current;
      for (const file of images) {
        const toastId = toast.loading(`Uploading ${file.name}…`);
        void (async (): Promise<void> => {
          const url = await uploadImageFile(file);
          toast.dismiss(toastId);
          if (url && ta) {
            insertImage(ta, url);
            syncChange();
            toast.success("Image uploaded");
          }
        })();
      }
    },
    [syncChange],
  );

  const handleDragOver = useCallback((ev: React.DragEvent) => {
    if (
      [...ev.dataTransfer.items].some(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      )
    ) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (ev: React.DragEvent) => {
      const files = ev.dataTransfer.files;
      if (files.length === 0) {
        return;
      }
      const hasImage = [...files].some((file) => file.type.startsWith("image/"));
      if (!hasImage) {
        return;
      }
      ev.preventDefault();
      handleImageFiles(files);
    },
    [handleImageFiles],
  );

  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "s") {
        ev.preventDefault();
        onSave?.();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key === "b") {
        ev.preventDefault();
        handleBold();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key === "i") {
        ev.preventDefault();
        handleItalic();
      }
    },
    [onSave, handleBold, handleItalic],
  );

  const handleEditorScroll = useCallback((ev: React.UIEvent<HTMLTextAreaElement>) => {
    const ta = ev.currentTarget;
    const preview = previewRef.current;
    if (!preview) {
      return;
    }
    const scrollable = ta.scrollHeight - ta.clientHeight;
    if (scrollable <= 0) {
      return;
    }
    preview.scrollTop = (ta.scrollTop / scrollable) * (preview.scrollHeight - preview.clientHeight);
  }, []);

  return {
    applyMeta,
    dlgMeta,
    fileInputRef,
    handleBold,
    handleCode,
    handleDragOver,
    handleDrop,
    handleEditorScroll,
    handleHeading,
    handleImageFiles,
    handleItalic,
    handleKeyDown,
    handleLink,
    handleNumbered,
    handlePropsOpen,
    handleQuote,
    handleStrikethrough,
    handleTask,
    handleUnordered,
    headingValue,
    helpOpen,
    previewRef,
    previewValue,
    propsOpen,
    saveSelection,
    setHelpOpen,
    setShowPreview,
    showPreview,
    taRef,
    themeOptions,
  };
}

export { useMarkdownEditor };
export type { UseMarkdownEditorProps };
