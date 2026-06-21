import { defaultRehypePlugins } from "streamdown";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import type { PluggableList } from "unified";
import type { ReactNode } from "react";
import { harden } from "rehype-harden";
import { ALLOWED_BG_URL_PREFIXES } from "@/lib/slide";
import rehypeEmojiPlugin from "./rehype-emoji-plugin";
import rehypeGfmAlertsPlugin from "./rehype-gfm-alerts-plugin";
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
  rehypeGfmAlertsPlugin,
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

// ── GFM Alert component ─────────────────────────────────────────────────────

interface KumiAlertProps {
  node?: unknown;
  children?: ReactNode;
}

const ALERT_LABELS: Record<string, string> = {
  CAUTION: "Caution",
  IMPORTANT: "Important",
  NOTE: "Note",
  TIP: "Tip",
  WARNING: "Warning",
};

const ALERT_CLASSES: Record<string, string> = {
  CAUTION: "border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200",
  IMPORTANT:
    "border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200",
  NOTE: "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
  TIP: "border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200",
  WARNING: "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200",
};

const KumiAlert = (allProps: KumiAlertProps): JSX.Element => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const nodeData = allProps.node as
    | { properties?: { dataAlertType?: unknown } }
    | undefined;
  const rawType = nodeData?.properties?.dataAlertType;
  const alertType = typeof rawType === "string" ? rawType : "NOTE";
  const label = ALERT_LABELS[alertType] ?? "Note";
  const classes = ALERT_CLASSES[alertType] ?? ALERT_CLASSES.NOTE;
  return (
    <div
      className={`border-l-4 rounded-r-lg px-4 py-3 my-4 ${classes}`}
      role="alert"
    >
      <p className="font-bold mb-1 text-inherit">{label}</p>
      {allProps.children}
    </div>
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
  "kumi-alert": KumiAlert,
  "kumi-emoji": KumiEmojiComponent,
};

/** Component map for slide markdown viewer. */
// oxfmt-ignore
// oxlint-disable-next-line id-length
const COMPONENTS_SLIDE: Record<string, (props: Record<string, unknown>) => JSX.Element> = {
  // oxlint-disable-next-line id-length
  a: SlideAnchorComponent,
  img: ImgComponent,
  "kumi-alert": KumiAlert,
  "kumi-emoji": KumiEmojiComponent,
};

export {
  AnchorComponent,
  COMPONENTS_DOC,
  COMPONENTS_SLIDE,
  ImgComponent,
  KumiAlert,
  KumiEmojiComponent,
  REHYPE_PLUGINS,
  SlideAnchorComponent,
};
