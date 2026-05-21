import MiniSearch from "minisearch";
import matter from "gray-matter";
import { getAllPaths, getFile, parseFileEntry } from "./filestore";
import { type FileType, type SearchResult } from "../lib/types";

interface DocEntry {
  id: string;
  path: string;
  title: string;
  emoji?: string;
  description?: string;
  type: string;
  content: string;
}

let index: MiniSearch<DocEntry> | undefined;

export function initSearch(): void {
  index = new MiniSearch<DocEntry>({
    fields: ["title", "content", "path", "description"],
    storeFields: ["title", "path", "emoji", "description", "type"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  rebuildIndex();
}

export function rebuildIndex(): void {
  if (!index) {
    return;
  }
  index.removeAll();
  const docs = buildDocs(getAllPaths());
  if (docs.length > 0) {
    index.addAll(docs);
  }
  console.log(`Search: indexed ${String(docs.length)} documents`);
}

function buildDocs(paths: string[]): DocEntry[] {
  return paths
    .filter((filePath) => filePath.endsWith(".md") && !filePath.startsWith("."))
    .map((path) => {
      const { title, emoji, type } = parseFileEntry(path);

      let body = getFile(path) ?? "";
      let description: string | undefined;
      try {
        const parsed = matter(body);
        body = parsed.content;
        if (typeof parsed.data.description === "string" && parsed.data.description.trim()) {
          description = parsed.data.description.trim();
        }
      } catch {
        // keep raw content if frontmatter parse fails
      }

      const stripped = body
        .replaceAll(/```[\s\S]*?```/gu, " ")
        .replaceAll(/`[^`]+`/gu, " ")
        .replaceAll(/^#{1,6}\s+/gmu, "")
        .replaceAll(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
        .replaceAll(/[*_~>|]/gu, "")
        .replaceAll(/\s+/gu, " ")
        .trim();

      return { id: path, path, title, emoji, description, type, content: stripped };
    });
}

export function updateInIndex(path: string): void {
  if (!index || !path.endsWith(".md")) {
    return;
  }
  try {
    index.remove({ id: path } as DocEntry);
  } catch {
    // Document was not in the index yet (e.g. brand-new file) — nothing to remove
  }
  const docs = buildDocs([path]);
  const doc = docs[0];
  if (doc) {
    try {
      index.add(doc);
    } catch (error: unknown) {
      console.warn("Failed to add to index:", error);
    }
  }
}

export function removeFromIndex(path: string): void {
  if (!index) {
    return;
  }
  try {
    index.remove({ id: path } as DocEntry);
  } catch (error: unknown) {
    console.warn("Failed to remove from index:", error);
  }
}

export function searchDocs(query: string, limit = 20): SearchResult[] {
  if (!index || !query.trim()) {
    return [];
  }
  const results = (
    index.search(query) as unknown as (Record<string, unknown> & { score: number })[]
  ).slice(0, limit);
  return results.map((result) => ({
    path: result.path as string,
    title: result.title as string,
    emoji: result.emoji as string | undefined,
    type: (result.type as FileType | undefined) ?? "doc",
    description: result.description as string | undefined,
    snippet: buildSnippet(result.path as string, query),
    score: result.score,
  }));
}

function buildSnippet(path: string, query: string): string {
  const content = getFile(path) ?? "";
  const body = content.replace(/^---[\s\S]*?---\n/u, "");
  const word = query.split(" ")[0]?.toLowerCase() ?? "";
  const idx = body.toLowerCase().indexOf(word);
  if (idx === -1) {
    return `${body.replaceAll("\n", " ").slice(0, 140)}…`;
  }
  const start = Math.max(0, idx - 60);
  const end = Math.min(body.length, idx + 120);
  return (
    (start > 0 ? "…" : "") +
    body.slice(start, end).replaceAll("\n", " ") +
    (end < body.length ? "…" : "")
  );
}
