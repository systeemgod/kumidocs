/**
 * Wiki-link (`[[Page Name]]`) resolution for KumiDocs.
 *
 * Two parts:
 * 1. **Lookup map** — maps page titles and partial paths to real file paths
 * 2. **resolveWikilinks** — pre-processes raw markdown, replacing `[[target]]`
 *    and `[[target|display text]]` with standard markdown links
 */

/** Lookup map returned by `GET /api/pages/lookup`. */
export interface WikilinkLookup {
  /** "Page Title" → "path/to/page.md" */
  byTitle: Record<string, string>;
  /** "path/to/page" (without .md) → "path/to/page.md" */
  byPath: Record<string, string>;
}

/**
 * Replace `[[target]]` and `[[target|display text]]` patterns in markdown
 * with resolved markdown links.
 *
 * Resolution order:
 * 1. Exact path match (without `.md`)
 * 2. Exact title match (case-insensitive)
 * 3. If not found → render as a dead link to the slugified path (which will
 *    show the "Create this page?" prompt via NotFound)
 */
export function resolveWikilinks(markdown: string, lookup: WikilinkLookup): string {
  return markdown.replaceAll(
    /\[\[([^\]]+?)(?:\|([^\]]+))?\]\]/gu,
    (_match, target: string, displayText?: string) => {
      const trimmed = target.trim();
      const display = (displayText ?? trimmed).trim();

      // 1. Try exact path match (e.g. [[docs/aws-architecture]])
      const pathKey = trimmed.replace(/\.md$/u, "");
      const resolvedPath = lookup.byPath[pathKey] ?? lookup.byPath[trimmed];

      if (resolvedPath !== undefined) {
        return `[${display}](/p/${resolvedPath.replace(/\.md$/u, "")})`;
      }

      // 2. Try title match (exact then case-insensitive)
      const titleHit =
        lookup.byTitle[trimmed] ??
        Object.entries(lookup.byTitle).find(
          ([title]) => title.toLowerCase() === trimmed.toLowerCase(),
        )?.[1];

      if (titleHit !== undefined) {
        return `[${display}](/p/${titleHit.replace(/\.md$/u, "")})`;
      }

      // 3. Dead link — slugify target and link to create page
      const slug = trimmed
        .toLowerCase()
        .replaceAll(/[^\w\s-]/gu, "")
        .trim()
        .replaceAll(/[\s_]+/gu, "-")
        .replaceAll(/-+/gu, "-");
      return `[${display}](/p/${slug}.md)`;
    },
  );
}
