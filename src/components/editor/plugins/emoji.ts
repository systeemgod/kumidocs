import type { ElementContent, Root, RootContent } from "hast";

const EMOJI_RE =
  /(?:[*#0-9]\uFE0F?\u20E3|[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]?(?:\u200D(?:\p{Extended_Pictographic}|\u2640\uFE0F?|\u2642\uFE0F?)[\p{Emoji_Modifier}\uFE0F]?)*)/gu;

const splitText = (text: string): ElementContent[] => {
  const re = new RegExp(EMOJI_RE.source, EMOJI_RE.flags);
  const parts: ElementContent[] = [];
  let lastIndex = 0;
  let match = re.exec(text);
  while (match) {
    const [emoji = ""] = match;
    const { index: start } = match;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({
      children: [],
      properties: { dataEmoji: emoji },
      tagName: "kumi-emoji",
      type: "element",
    });
    lastIndex = start + emoji.length;
    match = re.exec(text);
  }
  if (lastIndex < text.length && parts.length > 0) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
};

const walk = (node: Root | RootContent): void => {
  if (node.type === "element" && (node.tagName === "code" || node.tagName === "pre")) {
    return;
  }
  if (!("children" in node)) {
    return;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const children = node.children as ElementContent[];
  let index = 0;
  while (index < children.length) {
    const child = children[index];
    if (!child) {
      index += 1;
    } else if (child.type === "text") {
      const parts = splitText(child.value);
      if (parts.length > 0) {
        children.splice(index, 1, ...parts);
        index += parts.length;
      } else {
        index += 1;
      }
    } else {
      if ("children" in child) {
        walk(child);
      }
      index += 1;
    }
  }
};

const rehypeEmojiPlugin =
  (): ((tree: Root) => void) =>
  (tree: Root): void => {
    walk(tree);
  };

export default rehypeEmojiPlugin;
