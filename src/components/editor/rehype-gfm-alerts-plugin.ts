import type { ElementContent, Root } from "hast";

const ALERT_CLASSES: Record<string, string> = {
  CAUTION:
    "border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200",
  IMPORTANT:
    "border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200",
  NOTE:
    "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
  TIP:
    "border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200",
  WARNING:
    "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200",
};

const ALERT_RE = /^\[!(?<type>CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]\s*\n?/u;

/** Check if the first text content of a blockquote starts with a GFM alert marker. */
function matchAlertType(children: ElementContent[]): string | undefined {
  const first = children[0];
  if (first?.type !== "element" || first.tagName !== "p") {
    return undefined;
  }
  const textNode = first.children[0];
  if (textNode?.type !== "text") {
    return undefined;
  }
  const match = ALERT_RE.exec(textNode.value);
  return match?.groups?.type;
}

const walk = (node: ElementContent | Root): void => {
  if (node.type !== "element") {
    return;
  }
  // Recurse into children first (depth-first), except blockquotes which we
  // transform in-place.
  if (node.tagName !== "blockquote") {
    for (const child of node.children) {
      walk(child);
    }
    return;
  }
  const alertType = matchAlertType(node.children);
  if (alertType === undefined) {
    // Not a GFM alert — recurse into its children normally
    for (const child of node.children) {
      walk(child);
    }
    return;
  }

  // Transform blockquote into a styled alert div
  node.tagName = "div";
  node.properties = {
    className: [
      "gfm-alert",
      `gfm-alert--${alertType.toLowerCase()}`,
      "border-l-4",
      "rounded-r-lg",
      "px-4",
      "py-3",
      "my-4",
      ...(ALERT_CLASSES[alertType] ?? "").split(" "),
    ],
    role: "alert",
  };

  // Strip the "[!TYPE]\n" marker from the first paragraph's first text node
  const firstP = node.children[0];
  if (firstP?.type === "element" && firstP.tagName === "p") {
    const firstText = firstP.children[0];
    if (firstText?.type === "text") {
      firstText.value = firstText.value.replace(ALERT_RE, "");
    }
    // If the paragraph is now empty (just the marker was there), remove it
    if (
      firstP.children.length === 1 &&
      firstText?.type === "text" &&
      firstText.value.trim() === ""
    ) {
      node.children.shift();
    }
  }
};

const rehypeGfmAlertsPlugin =
  (): ((tree: Root) => void) =>
  (tree: Root): void => {
    for (const child of tree.children) {
      if (child.type === "element") {
        walk(child);
      }
    }
  };

export default rehypeGfmAlertsPlugin;
