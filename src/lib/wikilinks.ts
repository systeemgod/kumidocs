/**
 * Wiki-link (`[[Page Name]]`) resolution for KumiDocs.
 *
 * Two parts:
 * 1. **Lookup map**: maps page titles and partial paths to real file paths
 * 2. **resolveWikilinks**: pre-processes raw markdown, replacing `[[target]]`
 *    and `[[target|display text]]` with standard markdown links
 */

/** Lookup map returned by `GET /api/pages/lookup`. */
interface WikilinkLookup {
  /** "Page Title" → "path/to/page.md" */
  byTitle: Record<string, string>;
  /** "path/to/page" (without .md) → "path/to/page.md" */
  byPath: Record<string, string>;
}

/**
 * Regex to match wiki-link patterns: `[[target]]` or `[[target|display text]]`.
 *
 * Capture groups:
 * - `$1`: the link target (page name, path, etc.)
 * - `$2`: optional display text (when using `[[target|text]]`)
 */
const WIKILINK_RE = /\[\[(?<target>[^\]]+?)(?:\|(?<display>[^\]]+))?\]\]/gu;

/**
 * Resolve a wiki-link target to a file path using the lookup map.
 *
 * Resolution order:
 * 1. Exact path match (without `.md`)
 * 2. Exact title match
 * 3. Case-insensitive title match
 *
 * Returns `undefined` if no match is found (dead link).
 */
function resolveWikilinkTarget(target: string, lookup: WikilinkLookup): string | undefined {
  const trimmed = target.trim();

  // 1. Try exact path match (e.g. [[docs/aws-architecture]])
  const pathKey = trimmed.replace(/\.md$/u, "");
  const resolvedPath = lookup.byPath[pathKey] ?? lookup.byPath[trimmed];
  if (resolvedPath !== undefined) {
    return resolvedPath;
  }

  // 2. Try title match (exact then case-insensitive)
  return (
    lookup.byTitle[trimmed] ??
    Object.entries(lookup.byTitle).find(
      ([title]) => title.toLowerCase() === trimmed.toLowerCase(),
    )?.[1]
  );
}

/**
 * Replace `[[target]]` and `[[target|display text]]` patterns in markdown
 * with resolved markdown links.
 *
 * Uses {@link resolveWikilinkTarget} for resolution. Unresolved targets
 * render as dead links to a slugified path (showing the "Create this page?"
 * prompt via NotFound).
 */
function resolveWikilinks(markdown: string, lookup: WikilinkLookup): string {
  return markdown.replaceAll(WIKILINK_RE, (_match, target: string, displayText?: string) => {
    const trimmed = target.trim();
    const display = (displayText ?? trimmed).trim();
    const resolved = resolveWikilinkTarget(target, lookup);

    if (resolved !== undefined) {
      return `[${display}](/p/${resolved.replace(/\.md$/u, "")})`;
    }

    // Dead link: slugify target and link to create page
    const slug = trimmed
      .toLowerCase()
      .replaceAll(/[^\w\s-]/gu, "")
      .trim()
      .replaceAll(/[\s_]+/gu, "-")
      .replaceAll(/-+/gu, "-");
    return `[${display}](/p/${slug}.md)`;
  });
}

export type { WikilinkLookup };
export { resolveWikilinks, resolveWikilinkTarget, WIKILINK_RE };
