import {
  Bold,
  Code,
  Eye,
  EyeOff,
  FileQuestionMark,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Settings2,
  Strikethrough,
  TextQuote,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildFrontmatter, parseFrontmatter } from "@/lib/frontmatter";
import { useCallback, useMemo, useRef, useState } from "react";
import { BUILTIN_SLIDE_THEMES } from "@/lib/slide";
import { Button } from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Label from "@/components/ui/label";
import MarkdownViewer from "./markdown-viewer";
import type { PageMeta } from "@/lib/frontmatter";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "./slide-viewer";
import { toast } from "sonner";

// ── Toolbar action helpers ────────────────────────────────────────────────────

/** Wrap the current selection (or insert at cursor) with `before` and `after`.
 * Clicking the same action again toggles it off. */
function insertWrap(ta: HTMLTextAreaElement, before: string, after: string): void {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);

  // Toggle case 1: selected text includes the wrappers → unwrap.
  if (
    selected.length >= before.length + after.length &&
    selected.startsWith(before) &&
    selected.endsWith(after)
  ) {
    const inner = selected.slice(before.length, selected.length - after.length);
    ta.setRangeText(inner, start, end, "preserve");
    ta.setSelectionRange(start, start + inner.length);
    ta.focus();
    return;
  }

  // Toggle case 2: inner text is selected and is surrounded by markers → unwrap.
  if (
    start >= before.length &&
    end + after.length <= ta.value.length &&
    ta.value.slice(start - before.length, start) === before &&
    ta.value.slice(end, end + after.length) === after
  ) {
    ta.setRangeText(selected, start - before.length, end + after.length, "preserve");
    ta.setSelectionRange(start - before.length, start - before.length + selected.length);
    ta.focus();
    return;
  }

  // Toggle case 3: no selection, cursor sits between empty markers → remove them.
  if (
    start === end &&
    start >= before.length &&
    start + after.length <= ta.value.length &&
    ta.value.slice(start - before.length, start) === before &&
    ta.value.slice(start, start + after.length) === after
  ) {
    const removeStart = start - before.length;
    ta.setRangeText("", removeStart, start + after.length, "preserve");
    ta.setSelectionRange(removeStart, removeStart);
    ta.focus();
    return;
  }

  // Default: wrap.
  ta.setRangeText(before + selected + after, start, end, "preserve");
  if (selected.length > 0) {
    ta.setSelectionRange(start + before.length, start + before.length + selected.length);
  } else {
    ta.setSelectionRange(start + before.length, start + before.length);
  }
  ta.focus();
}

/** Set (or clear) a line prefix like `> ` or `## ` on the line at cursor.
 * Accepts an explicit `forcedStart` so callers can pass a saved cursor position
 * (needed when the textarea may have lost focus before this runs). */
function setLinePrefix(ta: HTMLTextAreaElement, prefix: string, forcedStart?: number): void {
  const start = forcedStart ?? ta.selectionStart;
  // Guard: lastIndexOf('\n', -1) is treated as lastIndexOf('\n', 0) in browsers,
  // which can return 0 when the text starts with '\n', making lineStart > lineEnd.
  const lineStart = start > 0 ? ta.value.lastIndexOf("\n", start - 1) + 1 : 0;
  const lineEndRaw = ta.value.indexOf("\n", start);
  const lineEnd = lineEndRaw === -1 ? ta.value.length : lineEndRaw;
  const line = ta.value.slice(lineStart, lineEnd);
  // Strip any existing heading/blockquote prefix.
  const stripped = line.replace(/^(#{1,6} |> )/u, "");
  const newLine = prefix ? `${prefix}${stripped}` : stripped;
  ta.setRangeText(newLine, lineStart, lineEnd, "preserve");
  ta.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
  ta.focus();
}

/** Toggle a list-style line prefix (- , 1. , - [ ] ) at the cursor line.
 * Unlike setLinePrefix, list prefixes are toggled off if already present. */
function toggleListPrefix(ta: HTMLTextAreaElement, prefix: string): void {
  const start = ta.selectionStart;
  const lineStart = start > 0 ? ta.value.lastIndexOf("\n", start - 1) + 1 : 0;
  const lineEndRaw = ta.value.indexOf("\n", start);
  const lineEnd = lineEndRaw === -1 ? ta.value.length : lineEndRaw;
  const line = ta.value.slice(lineStart, lineEnd);
  const stripped = line.replace(/^(#{1,6} |> |- \[ \] |- |[0-9]+\. )/u, "");
  const newLine = line.startsWith(prefix) ? stripped : `${prefix}${stripped}`;
  ta.setRangeText(newLine, lineStart, lineEnd, "preserve");
  ta.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
  ta.focus();
}

/** Insert a markdown link. Wraps selected text as link text; positions cursor
 * over the "url" placeholder so the user can type the URL immediately. */
function insertLink(ta: HTMLTextAreaElement): void {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const text = selected || "text";
  const insertion = `[${text}](url)`;
  ta.setRangeText(insertion, start, end, "preserve");
  const urlStart = start + 1 + text.length + 2; // position after "[text]("
  ta.setSelectionRange(urlStart, urlStart + 3); // select "url"
  ta.focus();
}

/** Insert an image markdown snippet. Uses selected text as alt text if any. */
function insertImage(ta: HTMLTextAreaElement, url: string): void {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const alt = ta.value.slice(start, end) || "image";
  const insertion = `![${alt}](${url})`;
  ta.setRangeText(insertion, start, end, "preserve");
  ta.focus();
}

/** Upload an image File to /api/upload/image and return the URL, or undefined on failure. */
async function uploadImageFile(file: File): Promise<string | undefined> {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch("/api/upload/image", { method: "POST", body: form });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({ error: "Upload failed" }))) as {
        error: string;
      };
      toast.error(error.error);
      return undefined;
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  } catch {
    toast.error("Upload failed");
    return undefined;
  }
}

// ── Cheatsheet content ────────────────────────────────────────────────────────

const CHEATSHEET_ROWS: [string, string][] = [
  ["# Heading 1", "H1"],
  ["## Heading 2", "H2"],
  ["**bold**", "Bold"],
  ["*italic*", "Italic"],
  ["> blockquote", "Blockquote"],
  ["`inline code`", "Inline code"],
  ["```\ncode block\n```", "Code block"],
  ["[text](url)", "Link"],
  ["![alt](url)", "Image"],
  ["- item", "Unordered list"],
  ["1. item", "Ordered list"],
  ["- [ ] task", "Task list"],
  ["---", "Horizontal rule"],
  ["| A | B |\n|---|---|\n| 1 | 2 |", "Table"],
];

// ── Component ─────────────────────────────────────────────────────────────────

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  disabled?: boolean;
  fileType?: string;
  slideTheme?: string;
  slidePaginate?: boolean;
  slideThemes?: SlideThemeMap;
  slideThemeVars?: Record<string, string>;
  onMetaChange?: (meta: PageMeta) => void;
}

const HEADING_OPTIONS = [
  { value: "normal", label: "Normal", prefix: "" },
  { value: "h1", label: "Heading 1", prefix: "#" },
  { value: "h2", label: "Heading 2", prefix: "##" },
  { value: "h3", label: "Heading 3", prefix: "###" },
  { value: "h4", label: "Heading 4", prefix: "####" },
  { value: "h5", label: "Heading 5", prefix: "#####" },
  { value: "h6", label: "Heading 6", prefix: "######" },
];

export default function MarkdownEditor({
  value,
  onChange,
  onSave,
  disabled,
  fileType,
  slideTheme,
  slidePaginate,
  slideThemes,
  slideThemeVars,
  onMetaChange,
}: MarkdownEditorProps): JSX.Element {
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
  const savedSelectionRef = useRef({ start: 0, end: 0 });
  const saveSelection = useCallback(() => {
    if (taRef.current) {
      savedSelectionRef.current = {
        start: taRef.current.selectionStart,
        end: taRef.current.selectionEnd,
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

  return (
    <div className="flex flex-col h-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-background shrink-0">
        {/* Left: formatting controls */}
        <div className="flex items-center gap-1">
          <Select value={headingValue} onValueChange={handleHeading} disabled={disabled}>
            <SelectTrigger size="sm" className="w-32 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEADING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 font-bold"
            onClick={handleBold}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Bold (Ctrl+B)"
          >
            <Bold />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 italic"
            onClick={handleItalic}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Italic (Ctrl+I)"
          >
            <Italic />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleStrikethrough}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Strikethrough"
          >
            <Strikethrough />
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCode}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Inline code"
          >
            <Code />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleLink}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Link"
          >
            <Link2 />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 font-serif text-base leading-none"
            onClick={handleQuote}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Blockquote"
          >
            <TextQuote />
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleUnordered}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Unordered list"
          >
            <List />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleNumbered}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Numbered list"
          >
            <ListOrdered />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleTask}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Task list"
          >
            <ListChecks />
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Insert image"
          >
            <Image />
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              handlePropsOpen(true);
            }}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title="Page properties"
          >
            <Settings2 />
          </Button>
        </div>

        {/* Right: meta controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setShowPreview((prev) => !prev);
            }}
            onMouseDown={(ev) => {
              ev.preventDefault();
            }}
            disabled={disabled}
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <Eye /> : <EyeOff />}
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                <span className="text-muted-foreground">
                  <FileQuestionMark />
                </span>
                Cheatsheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Markdown Cheatsheet</DialogTitle>
              </DialogHeader>
              <div className="text-xs space-y-1 mt-2">
                {CHEATSHEET_ROWS.map(([syntax, label]) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 py-1 border-b border-border/50 last:border-0"
                  >
                    <code className="flex-1 font-mono text-muted-foreground whitespace-pre-wrap">
                      {syntax}
                    </code>
                    <span className="text-foreground shrink-0 w-28 text-right">{label}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* ── Properties dialog ── */}
      <Dialog open={propsOpen} onOpenChange={handlePropsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Page properties</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Presentation mode */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="props-slides"
                checked={Boolean(dlgMeta.slides)}
                onCheckedChange={(checked) => {
                  applyMeta({ ...dlgMeta, slides: Boolean(checked) });
                }}
              />
              <Label htmlFor="props-slides">Presentation mode</Label>
            </div>
            {dlgMeta.slides && (
              <>
                <div className="border-t border-border" />
                {/* Theme */}
                <div className="flex items-center justify-between gap-4">
                  <Label>Theme</Label>
                  <Select
                    value={dlgMeta.theme ?? "default"}
                    onValueChange={(val) => {
                      applyMeta({
                        ...dlgMeta,
                        theme: val === "default" ? undefined : val,
                      });
                    }}
                  >
                    <SelectTrigger size="sm" className="w-36 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themeOptions.map((theme) => (
                        <SelectItem key={theme} value={theme} className="text-xs">
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Paginate */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="props-paginate"
                    checked={Boolean(dlgMeta.paginate)}
                    onCheckedChange={(checked) => {
                      applyMeta({ ...dlgMeta, paginate: Boolean(checked) });
                    }}
                  />
                  <Label htmlFor="props-paginate">Show page numbers</Label>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Two-pane content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — editor */}
        <div
          className={`flex-1 min-w-0 flex flex-col overflow-hidden${showPreview ? " border-r border-border" : ""}`}
        >
          <textarea
            ref={taRef}
            value={value}
            onChange={(ev) => {
              onChange(ev.target.value);
            }}
            onSelect={saveSelection}
            onClick={saveSelection}
            onKeyUp={saveSelection}
            onScroll={handleEditorScroll}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            spellCheck
            className="flex-1 resize-none outline-none bg-background text-foreground font-mono text-sm leading-relaxed p-6 overflow-y-auto placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Start writing…"
          />
        </div>

        {/* Right — live preview */}
        {showPreview && (
          <div className="flex-1 min-w-0 overflow-hidden">
            {fileType === "slide" ? (
              <SlideViewer
                value={previewValue}
                theme={slideTheme}
                paginate={slidePaginate}
                slideThemes={slideThemes}
                themeVars={slideThemeVars}
              />
            ) : (
              <div ref={previewRef} className="h-full overflow-y-auto">
                <MarkdownViewer value={previewValue} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for image picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(ev) => {
          if (ev.target.files) {
            handleImageFiles(ev.target.files);
            ev.target.value = "";
          }
        }}
      />
    </div>
  );
}
