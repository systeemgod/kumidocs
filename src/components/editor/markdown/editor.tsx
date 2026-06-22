import { useCallback, useRef } from "react";
import { ClipboardPaste, Copy, FileText, Redo2, Scissors, TextSelect, Undo2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import Label from "@/components/ui/label";
import MarkdownToolbar from "./toolbar";
import MarkdownViewer from "./viewer";
import type { PageMeta } from "@/lib/frontmatter";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "@/components/editor/slides/viewer";
import { useMarkdownEditor } from "./use-editor";

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
  const {
    taRef,
    previewRef,
    fileInputRef,
    headingValue,
    showPreview,
    setShowPreview,
    propsOpen,
    dlgMeta,
    previewValue,
    themeOptions,
    handlePropsOpen,
    handleHeading,
    handleBold,
    handleItalic,
    handleStrikethrough,
    handleCode,
    handleLink,
    handleQuote,
    handleUnordered,
    handleNumbered,
    handleTask,
    handleImageFiles,
    handleDragOver,
    handleDrop,
    handleKeyDown,
    handlePaste,
    handleEditorScroll,
    applyMeta,
    saveSelection,
  } = useMarkdownEditor({ onChange, onMetaChange, onSave, slideThemes, value });

  const valueRef = useRef(value);
  valueRef.current = value;

  const undoStackRef = useRef<string[]>([value]);
  const redoStackRef = useRef<string[]>([]);
  const isUndoRedoRef = useRef(false);
  const selectAllPendingRef = useRef(false);

  const handleTextareaChange = useCallback(
    (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = ev.target.value;
      const oldValue = valueRef.current;

      if (!isUndoRedoRef.current && newValue !== oldValue) {
        undoStackRef.current.push(oldValue);
        redoStackRef.current = [];
      }

      valueRef.current = newValue;
      onChange(newValue);
    },
    [onChange],
  );

  const handleContextUndo = useCallback(() => {
    const ta = taRef.current;
    if (!ta || undoStackRef.current.length <= 1) {
      return;
    }

    redoStackRef.current.push(valueRef.current);
    undoStackRef.current.pop();
    // Guaranteed non-null because we checked length > 1
    const prev = undoStackRef.current.at(-1) ?? "";

    isUndoRedoRef.current = true;
    onChange(prev);
    isUndoRedoRef.current = false;

    requestAnimationFrame(() => {
      ta.focus();
    });
  }, [onChange]);

  const handleContextRedo = useCallback(() => {
    const ta = taRef.current;
    if (!ta || redoStackRef.current.length === 0) {
      return;
    }

    const next = redoStackRef.current.pop();
    if (next === undefined) {
      return;
    }
    undoStackRef.current.push(valueRef.current);

    isUndoRedoRef.current = true;
    onChange(next);
    isUndoRedoRef.current = false;

    requestAnimationFrame(() => {
      ta.focus();
    });
  }, [onChange]);

  const handleContextCut = useCallback(async () => {
    const ta = taRef.current;
    if (!ta) {
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      return;
    }
    const text = valueRef.current.slice(start, end);

    try {
      await navigator.clipboard.writeText(text);
      const newValue = valueRef.current.slice(0, start) + valueRef.current.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start, start);
      });
    } catch {
      // Clipboard write permission denied
    }
  }, [onChange]);

  const handleContextCopy = useCallback(async () => {
    const ta = taRef.current;
    if (!ta) {
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      return;
    }
    try {
      await navigator.clipboard.writeText(valueRef.current.slice(start, end));
    } catch {
      // Clipboard write permission denied
    }
  }, []);

  const handleContextPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const ta = taRef.current;
      if (!ta) {
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = valueRef.current.slice(0, start) + text + valueRef.current.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + text.length, start + text.length);
      });
    } catch {
      // Clipboard read requires user gesture + permission
    }
  }, [onChange]);

  const handleContextSelectAll = useCallback(() => {
    selectAllPendingRef.current = true;
  }, []);

  return (
    <div className="flex flex-col h-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <MarkdownToolbar
        disabled={disabled}
        headingValue={headingValue}
        showPreview={showPreview}
        handleHeading={handleHeading}
        handleBold={handleBold}
        handleItalic={handleItalic}
        handleStrikethrough={handleStrikethrough}
        handleCode={handleCode}
        handleLink={handleLink}
        handleQuote={handleQuote}
        handleUnordered={handleUnordered}
        handleNumbered={handleNumbered}
        handleTask={handleTask}
        fileInputRef={fileInputRef}
        handlePropsOpen={handlePropsOpen}
        setShowPreview={setShowPreview}
      />
      {/* Properties dialog */}
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
            {dlgMeta.slides === true && (
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
      {/* Two-pane content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: editor */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`flex-1 min-w-0 flex flex-col overflow-hidden${showPreview ? " border-r border-border" : ""}`}
            >
              <textarea
                ref={taRef}
                value={value}
                onChange={handleTextareaChange}
                onSelect={saveSelection}
                onClick={saveSelection}
                onKeyUp={saveSelection}
                onScroll={handleEditorScroll}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={disabled}
                spellCheck
                className="flex-1 resize-none outline-none bg-background text-foreground font-mono text-sm leading-relaxed p-6 overflow-y-auto placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Start writing…"
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent
            className="min-w-[13rem]"
            onCloseAutoFocus={(ev) => {
              if (selectAllPendingRef.current) {
                selectAllPendingRef.current = false;
                ev.preventDefault();
                taRef.current?.select();
              }
            }}
          >
            <ContextMenuItem onSelect={handleContextUndo}>
              <Undo2 className="mr-2 size-4" />
              Undo
              <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleContextRedo}>
              <Redo2 className="mr-2 size-4" />
              Redo
              <ContextMenuShortcut>Ctrl+Shift+Z</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleContextCut}>
              <Scissors className="mr-2 size-4" />
              Cut
              <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleContextCopy}>
              <Copy className="mr-2 size-4" />
              Copy
              <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleContextPaste}>
              <ClipboardPaste className="mr-2 size-4" />
              Paste
              <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleContextPaste}>
              <FileText className="mr-2 size-4" />
              Paste as plain text
              <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleContextSelectAll}>
              <TextSelect className="mr-2 size-4" />
              Select all
              <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Right: live preview */}
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
                <MarkdownViewer key={previewValue} value={previewValue} />
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
