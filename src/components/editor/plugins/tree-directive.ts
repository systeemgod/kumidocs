import type { Root } from "hast";
import { visit } from "unist-util-visit";

const DIRECTIVE_RE = /^\[!(?<name>TREE|PAGES)\]$/u;

/**
 * Rehype plugin that transforms `[!TREE]` and `[!PAGES]` text nodes
 * into `<tree />` and `<pages />` custom elements so they are picked
 * up by Streamdown's component map.
 */
function rehypeTreeDirective(): (tree: Root) => void {
  return (tree: Root) => {
    visit(tree, "text", (node, index, parent) => {
      if (typeof node.value !== "string" || index === undefined || !parent) {
        return;
      }
      const match = DIRECTIVE_RE.exec(node.value);
      if (!match) {
        return;
      }
      const tagName = match[1] === "TREE" ? "tree" : "pages";
      // oxlint-disable-next-line no-param-reassign
      parent.children[index] = {
        children: [],
        properties: {},
        tagName,
        type: "element",
      };
    });
  };
}

export default rehypeTreeDirective;
