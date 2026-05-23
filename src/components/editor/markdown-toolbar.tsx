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
import { CHEATSHEET_ROWS, HEADING_OPTIONS } from "./markdown-editor-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type React from "react";

interface MarkdownToolbarProps { disabled?: boolean; fileInputRef: React.RefObject<HTMLInputElement | null>; handleBold: () => void; handleCode: () => void; handleHeading: (val: string) => void; handleItalic: () => void; handleLink: () => void; handleNumbered: () => void; handlePropsOpen: (open: boolean) => void; handleQuote: () => void; handleStrikethrough: () => void; handleTask: () => void; handleUnordered: () => void; headingValue: string; helpOpen: boolean; setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>; setShowPreview: React.Dispatch<React.SetStateAction<boolean>>; showPreview: boolean }

function MarkdownToolbar({
  disabled,
  headingValue,
  showPreview,
  helpOpen,
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
  fileInputRef,
  handlePropsOpen,
  setShowPreview,
  setHelpOpen,
}: MarkdownToolbarProps): JSX.Element {
  return (
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
  );
}

export default MarkdownToolbar;
