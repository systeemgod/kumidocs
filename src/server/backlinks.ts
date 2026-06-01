import type { WikilinkLookup } from "@/lib/wikilinks";
import { getAllPaths, getFile, parseFileEntry } from "./filestore";
import matter from "gray-matter";

/** A single backlink reference — another page that links to the current page. */
export interface BacklinkEntry {
  path: string;
  title: string;
  snippet: string;
}

// ── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Build the wiki-link lookup map from all `.md` files in the repo.
 * Used by the client to resolve `[[Page Name]]` links at render time.
 */
function buildLookup(): WikilinkLookup {
  const byTitle: Record<string, string> = {};
  const byPath: Record<string, string> = {};

  for (const filePath of getAllPaths()) {
    if (!filePath.endsWith(".md")) {
      continue;
    }

    const entry = parseFileEntry(filePath);
    // byTitle: map display title to path (skip duplicates — first wins)
    if (entry.title && !(entry.title in byTitle)) {
      byTitle[entry.title] = filePath;
    }
    // byPath: map path without .md to the full path
    const pathKey = filePath.replace(/\.md$/u, "");
    if (!(pathKey in byPath)) {
      byPath[pathKey] = filePath;
    }
    // Also map the base filename (e.g. "aws-architecture" → path)
    const baseName = filePath.split("/").pop()?.replace(/\.md$/u, "");
    if (baseName && baseName !== pathKey && !(baseName in byPath)) {
      byPath[baseName] = filePath;
    }
  }

  return { byPath, byTitle };
}

/** Handler for `GET /api/pages/lookup`. */
function apiPagesLookup(): Response {
  return Response.json(buildLookup());
}

// ── Backlinks ────────────────────────────────────────────────────────────────

/**
 * Find all pages that reference the given path via `[[target]]` wiki-links.
 *
 * Scans every `.md` file, extracts `[[...]]` patterns, and checks if the
 * resolved target matches the query path.
 */
function buildBacklinks(queryPath: string): BacklinkEntry[] {
  const lookup = buildLookup();
  const results: BacklinkEntry[] = [];
  // Normalise the query so both "path/to/page" and "path/to/page.md" work
  const queryNormalised = queryPath.replace(/\.md$/u, "");

  for (const filePath of getAllPaths()) {
    if (
      !filePath.endsWith(".md") ||
      filePath === queryPath ||
      filePath === `${queryNormalised}.md`
    ) {
      continue;
    }

    const content = getFile(filePath);
    if (!content) {
      continue;
    }

    // Skip frontmatter
    let body = content;
    try {
      const parsed = matter(content);
      body = parsed.content;
    } catch {
      // keep raw
    }

    // Find all [[target]] patterns in this file
    const wikiLinkRe = /\[\[([^\]]+?)(?:\|[^\]]+)?\]\]/gu;
    let match: RegExpExecArray | null;
    while ((match = wikiLinkRe.exec(body)) !== null) {
      const target = match[1]?.trim();
      if (!target) {
        continue;
      }

      // Resolve the target the same way the client does
      const pathKey = target.replace(/\.md$/u, "");
      const resolved =
        lookup.byPath[pathKey] ??
        lookup.byPath[target] ??
        lookup.byTitle[target] ??
        Object.entries(lookup.byTitle).find(
          ([title]) => title.toLowerCase() === target.toLowerCase(),
        )?.[1];

      if (resolved && resolved.replace(/\.md$/u, "") === queryNormalised) {
        const entry = parseFileEntry(filePath);
        const start = Math.max(0, match.index - 60);
        const end = Math.min(body.length, match.index + match[0].length + 60);
        const snippet =
          (start > 0 ? "…" : "") +
          body.slice(start, end).replaceAll("\n", " ") +
          (end < body.length ? "…" : "");

        results.push({ path: filePath, title: entry.title, snippet });
        break; // one result per linking page is enough
      }
    }
  }

  return results;
}

/** Handler for `GET /api/backlinks?path=<path>`. */
function apiBacklinks(url: URL): Response {
  const queryPath = url.searchParams.get("path") ?? "";
  if (!queryPath) {
    return Response.json({ error: "Missing 'path' query parameter" }, { status: 400 });
  }
  return Response.json(buildBacklinks(queryPath));
}

export { apiBacklinks, apiPagesLookup, buildLookup };
