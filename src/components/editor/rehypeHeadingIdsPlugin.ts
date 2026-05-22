import type { Element, ElementContent, Root, RootContent } from "hast";

const nodeText = (node: Element | ElementContent | RootContent): string => {
  if (node.type === "text") {
    return node.value;
  }
  if ("children" in node) {
    return node.children.map(nodeText).join("");
  }
  return "";
};

const walk = (node: Root | RootContent): void => {
  if (node.type === "element" && /^h[1-6]$/u.test(node.tagName)) {
    node.properties.id ??= nodeText(node)
      .toLowerCase()
      .replaceAll(/[^\w\s-]/gu, "")
      .trim()
      .replaceAll(/[\s_]+/gu, "-")
      .replaceAll(/-+/gu, "-");
  }
  if ("children" in node) {
    for (const child of node.children) {
      walk(child);
    }
  }
};

const rehypeHeadingIdsPlugin =
  (): ((tree: Root) => void) =>
  (tree: Root): void => {
    walk(tree);
  };

export { rehypeHeadingIdsPlugin };
