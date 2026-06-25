import type { Root, RootContent } from "hast";

/**
 * Resolve relative URLs against the current page path before harden processes
 * them. Without this, harden resolves relative URLs against the server origin
 * (e.g. `./foo` -> `http://localhost:5864/foo`), which breaks links on pages
 * nested under `/p/some-page/`.
 */

const walk = (node: Root | RootContent, pageDir: string): void => {
  if (
    node.type === "element" &&
    node.tagName === "a" &&
    typeof node.properties.href === "string"
  ) {
    const href = node.properties.href;
    // Skip fragment-only, already absolute (/), and protocol-absolute URLs
    if (
      !href.startsWith("#") &&
      !href.startsWith("/") &&
      !/^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(href)
    ) {
      node.properties.href = pageDir + href;
    }
  }
  if ("children" in node) {
    for (const child of node.children) {
      walk(child, pageDir);
    }
  }
};

const rehypeResolveRelativeUrlsPlugin = (): ((tree: Root) => void) => {
  // Resolve page directory once, at plugin creation time (runs in browser).
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  const pathname =
    globalThis.location === undefined ? "/" : globalThis.location.pathname;
  const pageDir = pathname.replace(/\/[^/]*$/u, "/");

  return (tree: Root): void => {
    walk(tree, pageDir);
  };
};

export default rehypeResolveRelativeUrlsPlugin;
