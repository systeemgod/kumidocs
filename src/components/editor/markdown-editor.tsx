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
import MarkdownToolbar from "./markdown-toolbar";
import MarkdownViewer from "./markdown-viewer";
import type { PageMeta } from "@/lib/frontmatter";
import type { SlideThemeMap } from "@/lib/slide";
import { SlideViewer } from "./slide-viewer";
import { useMarkdownEditor } from "./use-markdown-editor";

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
    handleEditorScroll,
    applyMeta,
    saveSelection,
  } = useMarkdownEditor({ onChange, onMetaChange, onSave, slideThemes, value });

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
