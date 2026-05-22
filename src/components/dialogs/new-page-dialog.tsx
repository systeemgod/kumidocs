import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import { EmojiIcon } from "../ui/emoji-icon";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { MarkdownType } from "@/lib/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface NewPageDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the new page is placed under this directory (e.g. "docs/api"). */
  parentDir?: string;
  onCreated?: () => void;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/[^a-z0-9-_]/gu, "")
    .replaceAll(/--+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

export function NewPageDialog({ open, onClose, parentDir, onCreated }: NewPageDialogProps): JSX.Element {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [pageType, setPageType] = useState<MarkdownType>("doc");
  const [creating, setCreating] = useState(false);

  // Auto-derive slug from title unless user has manually edited it (derived state, no effect needed)
  const effectiveSlug = slugEdited ? slug : slugify(title);

  const finalPath = effectiveSlug ? `${parentDir ? `${parentDir}/` : ""}${effectiveSlug}.md` : "";

  const handleCreate = useCallback(async () => {
    const resolvedSlug = slugEdited ? slug : slugify(title);
    if (!title.trim() || !resolvedSlug) {
      return;
    }
    setCreating(true);

    const slidesHeader = pageType === "slide" ? "---\nslides: true\n---\n\n" : "";
    const stub = `${slidesHeader}# ${title.trim()}\n`;

    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: finalPath, content: stub }),
    });

    setCreating(false);

    if (res.ok) {
      toast.success("Page created");
      onCreated?.();
      onClose();
      navigate(`/p/${finalPath}`);
    } else if (res.status === 409) {
      toast.error("A page at that path already exists.");
    } else {
      toast.error("Failed to create page");
    }
  }, [title, slug, slugEdited, pageType, finalPath, navigate, onCreated, onClose]);

  const handleKeyDown = async (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter" && !creating && title.trim() && effectiveSlug) {
      try {
        await handleCreate();
      } catch (error: unknown) {
        console.error("Failed to create page:", error);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setTitle("");
          setSlug("");
          setSlugEdited(false);
          setPageType("doc");
          setCreating(false);
        } else {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
          <DialogDescription>
            {parentDir
              ? `Create a sub-page under "${parentDir}"`
              : "Create a new page at the root of the repository"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {/* Page type selector */}
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={pageType === "doc" ? "default" : "outline"}
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => {
                  setPageType("doc");
                }}
              >
                <EmojiIcon fileType="doc" size={14} />
                Markdown
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pageType === "slide" ? "default" : "outline"}
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={() => {
                  setPageType("slide");
                }}
              >
                <EmojiIcon fileType="slide" size={14} />
                Slides
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="np-title">Title</Label>
            <Input
              id="np-title"
              autoFocus
              value={title}
              onChange={(ev) => {
                setTitle(ev.target.value);
              }}
              placeholder="My new page"
            />
          </div>

          {/* Slug (editable) */}
          <div className="grid gap-1.5">
            <Label htmlFor="np-slug">Filename slug</Label>
            <Input
              id="np-slug"
              value={effectiveSlug}
              onChange={(ev) => {
                setSlug(ev.target.value);
                setSlugEdited(ev.target.value !== "");
              }}
              placeholder="my-new-page"
            />
          </div>

          {/* Path preview */}
          {finalPath && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1.5 truncate">
              {finalPath}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                await handleCreate();
              } catch (error: unknown) {
                console.error("Failed to create page:", error);
              }
            }}
            disabled={creating || !title.trim() || !effectiveSlug}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
