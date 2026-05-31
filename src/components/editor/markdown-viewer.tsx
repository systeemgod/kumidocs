import { Streamdown, defaultRehypePlugins } from "streamdown";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import type { PluggableList } from "unified";
import type { ReactNode } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { harden } from "rehype-harden";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { memo } from "react";
import useMountEffect from "@/hooks/use-mount-effect";
import { registerMermaidIcons } from "@/lib/register-mermaid-icons";
import rehypeEmojiPlugin from "./rehype-emoji-plugin";
import rehypeHeadingIdsPlugin from "./rehype-heading-ids-plugin";
import rehypeImageAttrsPlugin from "./rehype-image-attrs-plugin";

interface MarkdownViewerProps {
  value: string;
}

const sanitizePlugin = defaultRehypePlugins.sanitize;
if (!sanitizePlugin) {
  throw new Error("streamdown sanitize plugin is required");
}

/** Resolve relative URLs against the current page origin. */
const LOCAL = "http://localhost:5864";
// oxlint-disable-next-line typescript/no-unnecessary-condition
const DEFAULT_ORIGIN = globalThis.location === undefined ? LOCAL : globalThis.location.origin;

const REHYPE_PLUGINS: PluggableList = [
  sanitizePlugin,
  [
    harden,
    {
      // Restrict to safe URL prefixes — "*" would allow javascript: URLs.
      allowedImagePrefixes: ["/images/", "https://", "http://", "data:image/", "./", "../"],
      allowedLinkPrefixes: ["https://", "http://", "mailto:", "#", "/", "./", "../"],
      defaultOrigin: DEFAULT_ORIGIN,
    },
  ],
  rehypeHeadingIdsPlugin,
  rehypeImageAttrsPlugin,
  rehypeEmojiPlugin,
];

const KumiEmojiComponent = (allProps: Record<string, unknown>): JSX.Element => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
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
  if (href?.startsWith("#") === true) {
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

// oxfmt-ignore
const COMPONENTS = { "a": AnchorComponent, "kumi-emoji": KumiEmojiComponent };

const MarkdownViewerInner = (allProps: MarkdownViewerProps): JSX.Element => {
  const { value } = allProps;

  useMountEffect(() => {
    void registerMermaidIcons();
  });

  return (
    <div className="prose prose-table:my-0 prose-img:my-0 prose-pre:my-0 prose-pre:bg-transparent prose-pre:text-foreground dark:prose-invert max-w-none px-8 py-6">
      <Streamdown
        mode="static"
        plugins={{ cjk, code, math, mermaid }}
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

export default MarkdownViewer;
