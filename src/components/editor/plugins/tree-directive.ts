import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const DIRECTIVE_RE = /^\[!(?<name>TREE|PAGES)\]$/u;

/**
 * Rehype plugin that transforms `[!TREE]` and `[!PAGES]` text nodes
 * into `<tree />` and `<pages />` custom elements.
 *
 * When the directive is the sole child of a `<p>`, the entire paragraph
 * is replaced so the block-level tree output is not nested inside `<p>`.
 */
function rehypeTreeDirective(): (tree: Root) => void {
  return (tree: Root) => {
    const toReplace: { childIndex: number; parent: Element; tagName: string }[] = [];

    visit(tree, "text", (node, index, parent) => {
      if (typeof node.value !== "string" || index === undefined || !parent) {
        return;
      }
      const match = DIRECTIVE_RE.exec(node.value);
      if (!match) {
        return;
      }
      const tagName = match[1] === "TREE" ? "tree" : "pages";

      // If the directive is the only child of a <p>, schedule the <p> for replacement
      if (parent.type === "element" && parent.tagName === "p" && parent.children.length === 1) {
        toReplace.push({ childIndex: index, parent, tagName });
      } else {
        // Otherwise replace just the text node
        // oxlint-disable-next-line no-param-reassign
        parent.children[index] = {
          children: [],
          properties: {},
          tagName,
          type: "element",
        };
      }
    });

    // Replace scheduled <p> elements with the tree/pages element
    for (const { parent, tagName } of toReplace) {
      const idx = tree.children.indexOf(parent);
      if (idx !== -1) {
        tree.children[idx] = {
          children: [],
          properties: {},
          tagName,
          type: "element",
        };
      }
    }
  };
}

export default rehypeTreeDirective;
