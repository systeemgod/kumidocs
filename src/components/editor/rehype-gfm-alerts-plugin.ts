import type { Element, ElementContent, Root } from "hast";

const ALERT_TYPES = ["CAUTION", "IMPORTANT", "NOTE", "TIP", "WARNING"] as const;

const ALERT_RE = /^\[!(?<type>CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]\s*\n?/u;

/** Check if the first text content of a blockquote starts with a GFM alert marker. */
function matchAlertType(children: ElementContent[]): (typeof ALERT_TYPES)[number] | undefined {
  const first = children[0];
  if (first?.type !== "element" || first.tagName !== "p") {
    return undefined;
  }
  const textNode = first.children[0];
  if (textNode?.type !== "text") {
    return undefined;
  }
  const match = ALERT_RE.exec(textNode.value);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return match?.groups?.type as (typeof ALERT_TYPES)[number] | undefined;
}

const walk = (node: Element | Root): void => {
  if (node.type !== "element") {
    return;
  }
  // Recurse into children first (depth-first)
  if (node.tagName !== "blockquote") {
    for (const child of node.children) {
      if (child.type === "element") {
        walk(child);
      }
    }
    return;
  }
  const alertType = matchAlertType(node.children);
  if (alertType === undefined) {
    for (const child of node.children) {
      if (child.type === "element") {
        walk(child);
      }
    }
    return;
  }

  // Replace the blockquote with a <kumi-alert type="..."> element.
  // Streamdown renders custom tag names via the components map, same as <kumi-emoji>.
  node.tagName = "kumi-alert";
  node.properties = { dataAlertType: alertType };

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
