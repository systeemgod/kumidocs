import { type ReactNode, memo } from "react";
import { Streamdown, defaultRehypePlugins } from "streamdown";
import { type PluggableList } from "unified";
import { EmojiIcon } from "@/components/ui/EmojiIcon";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { harden } from "rehype-harden";
import { math } from "@streamdown/math";
import { rehypeEmojiPlugin } from "./rehypeEmojiPlugin";
import { rehypeHeadingIdsPlugin } from "./rehypeHeadingIdsPlugin";
import { rehypeImageAttrsPlugin } from "./rehypeImageAttrsPlugin";

interface MarkdownViewerProps {
  value: string;
}

const sanitizePlugin = defaultRehypePlugins.sanitize;
if (!sanitizePlugin) {
  throw new Error("streamdown sanitize plugin is required");
}

const REHYPE_PLUGINS: PluggableList = [
  sanitizePlugin,
  [harden, { allowedLinkPrefixes: ["*"], allowedImagePrefixes: ["*"] }],
  rehypeHeadingIdsPlugin,
  rehypeImageAttrsPlugin,
  rehypeEmojiPlugin,
];

const KumiEmojiComponent = (allProps: Record<string, unknown>): JSX.Element => {
  const nodeData = allProps.node as { properties: { dataEmoji?: unknown } } | undefined;
  let emoji = "";
  if (nodeData && typeof nodeData.properties.dataEmoji === "string") {
    emoji = nodeData.properties.dataEmoji;
  }
  if (emoji) {
    return <EmojiIcon emoji={emoji} size="1.07lh" className="align-middle" />;
  }
  return <></>;
};

const AnchorComponent = (allProps: { href?: string; children?: ReactNode }): JSX.Element => {
  const { href, children } = allProps;
  let target = "_blank";
  if (href && href.startsWith("#")) {
    target = "_self";
  }
  return (
    <a
      className="wrap-anywhere font-medium text-primary underline"
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

const COMPONENTS = { "kumi-emoji": KumiEmojiComponent, "a": AnchorComponent };

const MarkdownViewerInner = (allProps: MarkdownViewerProps): JSX.Element => {
  const { value } = allProps;
  return (
    <div className="prose prose-table:my-0 prose-img:my-0 prose-pre:my-0 prose-pre:bg-transparent dark:prose-invert max-w-none px-8 py-6">
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
    </div>
  );
};

const MarkdownViewer = memo(MarkdownViewerInner);

export { MarkdownViewer };
