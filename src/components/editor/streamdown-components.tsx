import { defaultRehypePlugins } from "streamdown";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import type { PluggableList } from "unified";
import type { ReactNode } from "react";
import { harden } from "rehype-harden";
import rehypeEmojiPlugin from "./rehype-emoji-plugin";
import rehypeGfmAlertsPlugin from "./rehype-gfm-alerts-plugin";
import rehypeHeadingIdsPlugin from "./rehype-heading-ids-plugin";
import rehypeImageAttrsPlugin from "./rehype-image-attrs-plugin";

/** Allowed URL prefixes for images (rehype-harden + slide CSS validation) */
const ALLOWED_IMAGE_PREFIXES = ["/images/", "data:image/"];
/** Allowed URL to LINK to anywhere */
const ALLOWED_LINK_PREFIXES = ["*"];

// Shared rehype plugins

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
      allowDataImages: true,
      allowedImagePrefixes: ALLOWED_IMAGE_PREFIXES,
      allowedLinkPrefixes: ALLOWED_LINK_PREFIXES,
      allowedProtocols: ["mailto", "https"],
      defaultOrigin: DEFAULT_ORIGIN,
    },
  ],
  rehypeHeadingIdsPlugin,
  rehypeImageAttrsPlugin,
  rehypeEmojiPlugin,
  rehypeGfmAlertsPlugin,
];

// KumiEmojiComponent

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

// Anchor components

interface AnchorProps {
  href?: string;
  children?: ReactNode;
}

/** Anchor for document (non-slide) markdown - includes text-primary colour. */
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

/** Anchor for slide markdown - same as AnchorComponent but without text-primary. */
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

// Image component

interface ImgComponentProps {
  src?: string;
  alt?: string;
  title?: string;
  style?: string;
}

/**
 * Parse Marp-compatible image size keywords from alt text.
 *
 * Supports:
 *   ![width:200px](img.jpg)
 *   ![w:32 h:32](img.jpg)
 *   ![alt text w:300px](img.jpg)
 *   ![height:30cm](img.jpg)
 *
 * Keywords are stripped from the rendered alt text.
 */
function parseMarpSize(alt: string): { cleanAlt: string; marpWidth?: string; marpHeight?: string } {
  // Matches width:200px, w:32, height:30cm, h:100%, etc.
  const RE =
    /(?<key>width|height|w|h)\s*:\s*(?<value>[\d.]+(?:px|cm|mm|in|pt|pc|em|rem|%|auto)?)\s*/gi;
  let marpWidth: string | undefined;
  let marpHeight: string | undefined;

  let match: RegExpExecArray | null;
  while ((match = RE.exec(alt)) !== null) {
    const key = (match[1] ?? "").toLowerCase();
    const val = match[2] ?? "";
    if (key === "width" || key === "w") {
      marpWidth = val;
    } else if (key === "height" || key === "h") {
      marpHeight = val;
    }
  }

  const cleanAlt = alt.replaceAll(RE, "").replaceAll(/\s+/gu, " ").trim();
  return { cleanAlt, marpHeight, marpWidth };
}

const ImgComponent = (allProps: ImgComponentProps): JSX.Element => {
  const { src, alt = "", title, style } = allProps;
  const { cleanAlt, marpHeight, marpWidth } = parseMarpSize(alt);

  // Merge inline style from {key=value} plugin with Marp size keywords.
  // Marp keywords win over the {key=value} syntax when both are present.
  const mergedStyle: React.CSSProperties = {};

  // hast-util-to-jsx-runtime converts style strings to objects,
  // but accept string too for safety.
  if (typeof style === "string") {
    for (const part of style.split(";")) {
      const colonIdx = part.indexOf(":");
      if (colonIdx > 0) {
        const cssKey = part.slice(0, colonIdx).trim();
        const cssVal = part.slice(colonIdx + 1).trim();
        if (cssKey && cssVal) {
          const camelKey = cssKey.replaceAll(/-([a-z])/gu, (_m: string, c: string) =>
            c.toUpperCase(),
          );
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          (mergedStyle as Record<string, string>)[camelKey] = cssVal;
        }
      }
    }
  }

  if (marpWidth) mergedStyle.width = marpWidth;
  if (marpHeight) mergedStyle.height = marpHeight;

  return (
    <img
      src={src}
      alt={cleanAlt}
      title={title}
      className="max-w-full h-auto"
      style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
      loading="lazy"
    />
  );
};

// GFM Alert component

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

const ALERT_ICONS: Record<string, string> = {
  CAUTION: "\uD83C\uDD98",
  IMPORTANT: "\u2611\uFE0F",
  NOTE: "\u2139\uFE0F",
  TIP: "\uD83D\uDD30",
  WARNING: "\uD83D\uDEB8",
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
  const nodeData = allProps.node as { properties?: { dataAlertType?: unknown } } | undefined;
  const rawType = nodeData?.properties?.dataAlertType;
  const alertType = typeof rawType === "string" ? rawType : "NOTE";
  const label = ALERT_LABELS[alertType] ?? "Note";
  const classes = ALERT_CLASSES[alertType] ?? ALERT_CLASSES.NOTE;
  const emoji = ALERT_ICONS[alertType] ?? ALERT_ICONS.NOTE;
  return (
    <div className={`border-l-10 rounded-r-lg px-5 py-3 my-4 not-prose ${classes}`} role="alert">
      <div className="font-bold mt-2 mb-3 text-inherit flex items-center gap-3 leading-none">
        <EmojiIcon emoji={emoji} size="28px" />
        <span>{label}</span>
      </div>
      {allProps.children}
    </div>
  );
};

// Component maps

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
  ALLOWED_IMAGE_PREFIXES as ALLOWED_BG_URL_PREFIXES,
  ALLOWED_LINK_PREFIXES,
  AnchorComponent,
  COMPONENTS_DOC,
  COMPONENTS_SLIDE,
  ImgComponent,
  KumiAlert,
  KumiEmojiComponent,
  REHYPE_PLUGINS,
  SlideAnchorComponent,
};
