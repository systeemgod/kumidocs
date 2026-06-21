import { defaultRehypePlugins } from "streamdown";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import type { PluggableList } from "unified";
import type { ReactNode } from "react";
import { harden } from "rehype-harden";
import { ALLOWED_BG_URL_PREFIXES } from "@/lib/slide";
import rehypeEmojiPlugin from "./rehype-emoji-plugin";
import rehypeHeadingIdsPlugin from "./rehype-heading-ids-plugin";
import rehypeImageAttrsPlugin from "./rehype-image-attrs-plugin";

// ── Shared rehype plugins ──────────────────────────────────────────────────

const sanitizePlugin = defaultRehypePlugins.sanitize;
if (!sanitizePlugin) {
  throw new Error("Streamdown sanitize plugin is not available");
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
      // Restrict to safe URL prefixes; "*" allows all http/https as a fallback.
      // Specific prefixes like "/" are checked first (origin-scoped); "*" catches external URLs.
      allowedImagePrefixes: ALLOWED_BG_URL_PREFIXES,
      allowedLinkPrefixes: ["/", "./", "../", "#", "mailto:", "*"],
      defaultOrigin: DEFAULT_ORIGIN,
    },
  ],
  rehypeHeadingIdsPlugin,
  rehypeImageAttrsPlugin,
  rehypeEmojiPlugin,
];

// ── KumiEmojiComponent ─────────────────────────────────────────────────────

interface KumiEmojiProps {
  node?: unknown;
}

const KumiEmojiComponent = (allProps: KumiEmojiProps): JSX.Element => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const typedNode = allProps.node as { properties?: { dataEmoji?: unknown } } | undefined;
  const raw = typedNode?.properties?.dataEmoji;
  let emoji = "";
  if (typeof raw === "string") {
    emoji = raw;
  }
  if (!emoji) {
    return <></>;
  }
  return <EmojiIcon emoji={emoji} size="1.07lh" className="align-middle" />;
};

// ── Anchor components ──────────────────────────────────────────────────────

interface AnchorProps {
  href?: string;
  children?: ReactNode;
}

/** Anchor for document (non-slide) markdown – includes text-primary colour. */
const AnchorComponent = (allProps: AnchorProps): JSX.Element => {
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

/** Anchor for slide markdown – same as AnchorComponent but without text-primary. */
const SlideAnchorComponent = (allProps: AnchorProps): JSX.Element => {
  const { href, children } = allProps;
  let target = "_blank";
  if (href?.startsWith("#") === true) {
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

// ── Image component ────────────────────────────────────────────────────────

interface ImgComponentProps {
  src?: string;
  alt?: string;
  title?: string;
}

const ImgComponent = (allProps: ImgComponentProps): JSX.Element => {
  const { src, alt, title } = allProps;
  return (
    <img src={src} alt={alt ?? ""} title={title} className="max-w-full h-auto" loading="lazy" />
  );
};

// ── Component maps ─────────────────────────────────────────────────────────

/** Component map for document (non-slide) markdown viewer. */
// oxfmt-ignore
// oxlint-disable-next-line id-length
const COMPONENTS_DOC: Record<string, (props: Record<string, unknown>) => JSX.Element> = {
  // oxlint-disable-next-line id-length
  a: AnchorComponent,
  img: ImgComponent,
  "kumi-emoji": KumiEmojiComponent,
};

/** Component map for slide markdown viewer. */
// oxfmt-ignore
// oxlint-disable-next-line id-length
const COMPONENTS_SLIDE: Record<string, (props: Record<string, unknown>) => JSX.Element> = {
  // oxlint-disable-next-line id-length
  a: SlideAnchorComponent,
  img: ImgComponent,
  "kumi-emoji": KumiEmojiComponent,
};

export {
  AnchorComponent,
  COMPONENTS_DOC,
  COMPONENTS_SLIDE,
  ImgComponent,
  KumiEmojiComponent,
  REHYPE_PLUGINS,
  SlideAnchorComponent,
};
