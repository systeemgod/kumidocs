/**
 * Shared heading utilities for KumiDocs.
 *
 * `headingToSlug` must stay in sync with `rehypeHeadingIdsPlugin` so that
 * heading IDs generated at render-time match the slugs we derive from raw
 * markdown for the Table of Contents.
 */

/** A single entry in the page table of contents. */
interface TocItem {
  /** DOM `id` attribute on the rendered heading element. */
  id: string;
  /** Raw heading text (not slugified). */
  text: string;
  /** Heading level: 1-6. */
  level: number;
}

/**
 * Convert heading text to a URL-safe slug matching the algorithm in
 * `rehypeHeadingIdsPlugin`.
 *
 * Algorithm:
 *   1. lowercase
 *   2. strip non-word chars (keep \w, \s, -)
 *   3. trim
 *   4. replace whitespace / underscores -> hyphens
 *   5. collapse consecutive hyphens
 */
function headingToSlug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^\w\s-]/gu, "")
    .trim()
    .replaceAll(/[\s_]+/gu, "-")
    .replaceAll(/-+/gu, "-");
}

/**
 * Extract a flat list of TOC items from raw markdown content.
 *
 * Heading lines inside fenced code blocks (```) are skipped so that example
 * headings in documentation are not picked up.
 *
 * The generated `id` matches what `rehypeHeadingIdsPlugin` will produce at
 * render time.
 */
function extractTocItems(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    // Toggle code-fence tracking (triple backticks or tildes).
    if (/^(?<fence>```|~~~)/u.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }

    // Match ATX headings: `### Some Title`
    const match = /^(?<hashes>#{1,6})\s+(?<text>.+)$/u.exec(line);
    if (match) {
      const hashes = match[1];
      const headingText = match[2];
      if (hashes !== undefined && headingText !== undefined) {
        const level = hashes.length;
        const text = headingText.trim();
        const id = headingToSlug(text);
        items.push({ id, level, text });
      }
    }
  }

  return items;
}

export { headingToSlug, extractTocItems };
export type { TocItem };
