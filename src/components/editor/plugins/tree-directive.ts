import type { Root } from "hast";
import { visit } from "unist-util-visit";

const DIRECTIVE_RE = /^\[!(?<name>TREE|TREE-NESTED)\]$/u;

/**
 * Rehype plugin that transforms `[!TREE]` and `[!TREE-NESTED]` text nodes
 * into `<tree />` and `<tree-nested />` custom elements so they are picked
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
      const name = match[1] === "TREE-NESTED" ? "tree-nested" : "tree";
      // oxlint-disable-next-line no-param-reassign
      parent.children[index] = {
        children: [],
        properties: {},
        tagName: name,
        type: "element",
      };
    });
  };
}

export default rehypeTreeDirective;
