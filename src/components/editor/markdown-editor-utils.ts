import { ApiError, uploadImage } from "@/lib/api";
import { toast } from "@/components/ui/toaster";

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
  const stripped = line.replace(/^(?<prefix>#{1,6} |> )/u, "");
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
  const stripped = line.replace(/^(?<prefix>#{1,6} |> |- \[ \] |- |[0-9]+\. )/u, "");
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
  try {
    const data = await uploadImage(file);
    return data.url;
  } catch (error: unknown) {
    const body =
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      error instanceof ApiError ? (error.body as { error?: string } | undefined) : undefined;
    toast.error(body?.error ?? "Upload failed");
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

const HEADING_OPTIONS = [
  { label: "Normal", prefix: "", value: "normal" },
  { label: "Heading 1", prefix: "#", value: "h1" },
  { label: "Heading 2", prefix: "##", value: "h2" },
  { label: "Heading 3", prefix: "###", value: "h3" },
  { label: "Heading 4", prefix: "####", value: "h4" },
  { label: "Heading 5", prefix: "#####", value: "h5" },
  { label: "Heading 6", prefix: "######", value: "h6" },
];

export {
  insertWrap,
  setLinePrefix,
  toggleListPrefix,
  insertLink,
  insertImage,
  uploadImageFile,
  CHEATSHEET_ROWS,
  HEADING_OPTIONS,
};
