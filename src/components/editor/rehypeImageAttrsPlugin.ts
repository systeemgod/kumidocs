/**
 * rehypeImageAttrs — rehype plugin that parses `{key=value …}` attribute blocks
 * written immediately after an image in Markdown, and applies them as inline CSS.
 *
 * Supported syntax (no spaces inside the braces):
 *   ![alt](/url){width=200px}
 *   ![alt](/url){width=50% height=auto}
 *   ![alt](/url){width=300px height=200px}
 *
 * Supported keys:  width, height, max-width, min-width, max-height, min-height
 * Values may be any valid CSS length: px, %, em, rem, vw, vh, or the keyword "auto".
 *
 * The block is removed from the rendered output after parsing.
 */
import { type Root, type Element, type ElementContent } from "hast";

// Matches a {key=value …} block — no nested braces.
const ATTRS_RE = /^\{([^}]+)\}/u;
// Matches individual key=value pairs. Values: alphanumeric chars plus - . % (no spaces).
const PAIR_RE = /([a-zA-Z-]+)=([\w.%]+)/gu;

// CSS properties we allow to be set via this syntax.
const ALLOWED: ReadonlySet<string> = new Set([
  "width",
  "height",
  "max-width",
  "min-width",
  "max-height",
  "min-height",
]);

function parseBlock(raw: string): Record<string, string> | null {
  const attrs: Record<string, string> = {};
  let matched = false;
  let match: RegExpExecArray | null;
  PAIR_RE.lastIndex = 0;
  while ((match = PAIR_RE.exec(raw)) !== null) {
    const key = match[1];
    const val = match[2];
    if (key !== undefined && val !== undefined && ALLOWED.has(key.toLowerCase())) {
      attrs[key.toLowerCase()] = val;
      matched = true;
    }
  }
  return matched ? attrs : null;
}

// Djb2-inspired hash to fingerprint the applied style.
function styleFingerprint(attrs: Record<string, string>): number {
  const str = Object.entries(attrs)
    .map(([key, val]) => `${key}:${val}`)
    .join(";");
  let hashVal = 5381;
  for (let idx = 0; idx < str.length; idx++) {
    hashVal = Math.trunc((hashVal << 5) - hashVal + (str.codePointAt(idx) ?? 0));
  }
  return (Math.abs(hashVal) % 1_000_000) + 1;
}

// Apply a stylehash-N class to an element so Streamdown's memo comparators
// (which check className) see a change and force a re-render.
function applyHashToNode(el: Element, hash: string): void {
  const cls = el.properties.className;
  if (Array.isArray(cls)) {
    const filtered = cls.filter((item) => typeof item !== "string" || !item.startsWith("stylehash-"));
    filtered.push(hash);
    el.properties.className = filtered;
  } else {
    const base = typeof cls === "string" ? cls.replaceAll(/\bstylehash-\S+/gu, "").trim() : "";
    el.properties.className = base ? `${base} ${hash}` : hash;
  }
}

// Returns the hash that was applied, so callers can propagate it up the tree.
function applyAttrs(img: Element, attrs: Record<string, string>): string {
  const parts = Object.entries(attrs).map(([key, val]) => `${key}: ${val}`);
  const existing = typeof img.properties.style === "string" ? img.properties.style : "";
  img.properties.style = existing ? `${existing}; ${parts.join("; ")}` : parts.join("; ");

  const fp = styleFingerprint(attrs);
  const hash = `stylehash-${String(fp)}`;
  applyHashToNode(img, hash);
  return hash;
}

function walk(node: Root | Element): void {
  const children = node.children as ElementContent[];
  let idx = 0;
  while (idx < children.length) {
    const child = children[idx];

    if (child === undefined || child.type !== "element" || child.tagName !== "img") {
      if (child !== undefined && "children" in child) {
        walk(child);
      }
      idx++;
      continue;
    }

    // child is an <img> — look for an immediately following attribute block
    const sibling = children[idx + 1];
    const match = sibling?.type === "text" ? ATTRS_RE.exec(sibling.value) : null;
    const rawAttrs = match?.[1];
    const attrs = rawAttrs !== undefined ? parseBlock(rawAttrs) : null;

    if (match === null || attrs === null) {
      idx++;
      continue;
    }

    const hash = applyAttrs(child, attrs);
    // Also bust the parent element's memo (MemoParagraph wraps MemoImg
    // and has its own sameClassAndNode comparator — if the paragraph's
    // className doesn't change, MemoParagraph skips re-rendering entirely
    // and MemoImg never gets the updated props).
    if (node.type === "element") {
      applyHashToNode(node, hash);
    }
    const remaining = (sibling as { value: string }).value.slice(match[0].length);
    if (remaining.trim()) {
      children.splice(idx + 1, 1, { type: "text", value: remaining });
    } else {
      children.splice(idx + 1, 1);
    }
    idx++;
  }
}

export function rehypeImageAttrsPlugin(): (tree: Root) => void {
  return (tree: Root) => {
    walk(tree);
  };
}
