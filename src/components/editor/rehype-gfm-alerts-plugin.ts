import type { Element, ElementContent, Root } from "hast";

const ALERT_TYPES = ["CAUTION", "IMPORTANT", "NOTE", "TIP", "WARNING"] as const;

const ALERT_RE = /^\[!(?<type>CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]\s*\n?/u;

/** Check if the first <p> inside a blockquote starts with a GFM alert marker.
 * Skips leading whitespace text nodes (remark/rehype may insert \n text nodes). */
function matchAlertType(children: ElementContent[]): (typeof ALERT_TYPES)[number] | undefined {
  const firstP = children.find(
    (child): child is ElementContent & { type: "element"; tagName: "p" } =>
      child.type === "element" && child.tagName === "p",
  );
  if (!firstP) {
    return undefined;
  }
  const textNode = firstP.children[0];
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

  // Strip the "[!TYPE]\n" marker from the alert paragraph's first text node
  const alertP = node.children.find(
    (child): child is ElementContent & { type: "element"; tagName: "p" } =>
      child.type === "element" && child.tagName === "p",
  );
  if (alertP) {
    const firstText = alertP.children[0];
    if (firstText?.type === "text") {
      firstText.value = firstText.value.replace(ALERT_RE, "");
    }
    // If the paragraph is now empty (just the marker was there), remove it
    if (
      alertP.children.length === 1 &&
      firstText?.type === "text" &&
      firstText.value.trim() === ""
    ) {
      const idx = node.children.indexOf(alertP);
      if (idx !== -1) {
        node.children.splice(idx, 1);
      }
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
