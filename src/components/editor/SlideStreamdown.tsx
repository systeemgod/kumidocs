import { Streamdown, defaultRehypePlugins } from "streamdown";
import { type PluggableList } from "unified";
import { EmojiIcon } from "@/components/ui/EmojiIcon";
import { type ReactNode } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { harden } from "rehype-harden";
import { math } from "@streamdown/math";
import { rehypeEmojiPlugin } from "@/components/editor/rehypeEmojiPlugin";
import { rehypeHeadingIdsPlugin } from "@/components/editor/rehypeHeadingIdsPlugin";
import { rehypeImageAttrsPlugin } from "@/components/editor/rehypeImageAttrsPlugin";

const sanitizePlugin = defaultRehypePlugins.sanitize;
if (!sanitizePlugin) {
  throw new Error("Streamdown sanitize plugin is not available");
}

const REHYPE_PLUGINS: PluggableList = [
  sanitizePlugin,
  [harden, { allowedLinkPrefixes: ["*"], allowedImagePrefixes: ["*"] }],
  rehypeHeadingIdsPlugin,
  rehypeImageAttrsPlugin,
  rehypeEmojiPlugin,
];

interface KumiEmojiProps {
  node?: unknown;
}

const KumiEmojiComponent = (allProps: KumiEmojiProps): JSX.Element => {
  const typedNode = allProps.node as { properties?: { dataEmoji?: unknown } } | undefined;
  const raw = typedNode && typedNode.properties && typedNode.properties.dataEmoji;
  let emoji = "";
  if (typeof raw === "string") {
    emoji = raw;
  }
  if (!emoji) {
    return <></>;
  }
  return <EmojiIcon emoji={emoji} size="1.07lh" className="align-middle" />;
};

interface SlideAnchorProps {
  href?: string;
  children?: ReactNode;
}

const SlideAnchorComponent = (allProps: SlideAnchorProps): JSX.Element => {
  const { href, children } = allProps;
  let target = "_blank";
  if (href && href.startsWith("#")) {
    target = "_self";
  }
  return (
    <a
      className="wrap-anywhere font-medium underline"
      data-incomplete="false"
      data-streamdown="link"
      href={href}
      rel="noopener noreferrer"
      target={target}
    >
      {children}
    </a>
  );
};

const COMPONENTS = {
  "kumi-emoji": KumiEmojiComponent,
  a: SlideAnchorComponent,
};

interface SlideStreamdownProps {
  value: string;
}

const SlideStreamdown = (allProps: SlideStreamdownProps): JSX.Element => {
  const { value } = allProps;
  return (
    <Streamdown
      mode="static"
      plugins={{ cjk, code, math }}
      shikiTheme={["github-light", "github-dark"]}
      linkSafety={{ enabled: false }}
      components={COMPONENTS}
      rehypePlugins={REHYPE_PLUGINS}
    >
      {value}
    </Streamdown>
  );
};

export { SlideStreamdown };
