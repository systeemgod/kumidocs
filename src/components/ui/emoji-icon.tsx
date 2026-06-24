// oxlint-disable typescript/no-deprecated
/** Fluent for system icons, Fluent Emoji SVGs for page emoji. */
import type { CSSProperties, FC } from "react";
import {
  Code24Color,
  Image24Color,
  QuestionCircle24Color,
  SlideTextSparkle24Color,
  TextBulletListSquare24Color,
} from "@fluentui/react-icons";
import EMOJI_SVGS from "./emoji/emojis";
import type { FileType } from "@/lib/types";
import { Fragment } from "react";

// File type strings for EmojiIcon: well-known values listed for autocomplete, open to any string
const FILE_TYPE_ICONS: Record<string, FC<{ style?: CSSProperties; className?: string }>> = {
  code: Code24Color,
  doc: TextBulletListSquare24Color,
  image: Image24Color,
  slide: SlideTextSparkle24Color,
};

// ── File-type favicon SVGs (flat colors, no gradients — data URI safe) ──

const FILE_TYPE_FAVICONS: Record<string, string> = {
  code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="m8.09 18.61 6-14a1 1 0 0 1 1.87.67l-.04.11-6 14a1 1 0 0 1-1.87-.67l.04-.1 6-14.01-6 14Zm-5.8-7.32 4-4a1 1 0 0 1 1.5 1.32l-.08.1L4.4 12l3.3 3.3a1 1 0 0 1-1.32 1.49l-.1-.08-4-4a1 1 0 0 1-.08-1.32l.08-.1 4-4-4 4Zm14-4a1 1 0 0 1 1.32-.08l.1.08 4 4a1 1 0 0 1 .08 1.32l-.08.1-4 4a1 1 0 0 1-1.5-1.33l.08-.1L19.6 12l-3.3-3.3a1 1 0 0 1 0-1.4Z" fill="#8B52F4"/></svg>`,
  doc: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6.25 3A3.25 3.25 0 0 0 3 6.25v11.5C3 19.55 4.46 21 6.25 21h11.5c1.8 0 3.25-1.46 3.25-3.25V6.25C21 4.45 19.54 3 17.75 3H6.25Z" fill="#0FAFFF"/><path d="M7.75 9.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.5-1.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Zm0 3.75a.75.75 0 1 0 0 1.5h5.5a.75.75 0 1 0 0-1.5h-5.5Zm-.75 4.5c0 .41.34.75.75.75h5.5a.75.75 0 1 0 0-1.5h-5.5a.75.75 0 0 0-.75.75ZM8.75 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-1 4.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="#fff"/></svg>`,
  image: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M17.75 3C19.55 3 21 4.46 21 6.25v11.5c0 1.8-1.46 3.25-3.25 3.25H6.25A3.25 3.25 0 0 1 3 17.75V6.25C3 4.45 4.46 3 6.25 3h11.5Z" fill="#0FAFFF"/><path d="M20.51 19.46A3.25 3.25 0 0 1 17.75 21H6.25c-1.17 0-2.2-.62-2.76-1.54l6.93-6.81.14-.13c.83-.7 2.05-.7 2.89.01l.13.12 6.93 6.8Z" fill="#B3E0FF"/><path d="M16 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" fill="#fff"/></svg>`,
  slide: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19.25 3.99H4.75A2.75 2.75 0 0 0 2 6.74v10.5a2.75 2.75 0 0 0 2.75 2.75h14.5A2.75 2.75 0 0 0 22 17.24V6.74a2.75 2.75 0 0 0-2.75-2.75Z" fill="#DD3CE2"/><path d="m13.36 5 1.38.45a2.85 2.85 0 0 1 1.79 1.81l.45 1.38c.04.11.11.2.2.26.09.07.2.1.31.1a.5.5 0 0 0 .31-.1.6.6 0 0 0 .19-.23l.01-.03.45-1.38a2.85 2.85 0 0 1 1.8-1.8l1.38-.45c.11-.04.2-.11.26-.2a.5.5 0 0 0 .1-.31.5.5 0 0 0-.1-.31.57.57 0 0 0-.26-.2h-.03l-1.38-.45a2.85 2.85 0 0 1-1.8-1.8L17.97.36a.52.52 0 0 0-.2-.26.5.5 0 0 0-.31-.1.5.5 0 0 0-.31.1.63.63 0 0 0-.2.26l-.45 1.38v.03a2.81 2.81 0 0 1-1.77 1.76l-1.38.45a.52.52 0 0 0-.26.2.5.5 0 0 0-.1.31c0 .11.03.22.1.31s.16.16.26.2h.01Z" fill="#fff" opacity=".8"/><path d="M16 11.74a.76.76 0 0 0-.75-.75h-8.5a.76.76 0 0 0-.75.75c0 .41.34.75.75.75h8.5c.41 0 .75-.34.75-.75Z" fill="#fff" opacity=".9"/><path d="M6.75 13.99a.76.76 0 0 0-.75.75c0 .41.34.75.75.75h6.5c.41 0 .75-.34.75-.75a.76.76 0 0 0-.75-.75h-6.5Z" fill="#fff" opacity=".9"/><path d="M6.75 9.49h4.5c.41 0 .75-.34.75-.75a.76.76 0 0 0-.75-.75h-4.5a.76.76 0 0 0-.75.75c0 .41.34.75.75.75Z" fill="#fff" opacity=".9"/></svg>`,
};

/**
 * Resolve an emoji character to its SVG data URI from the Fluent Emoji bundle.
 * Falls back to a file-type SVG favicon when no emoji is set.
 * Shared by EmojiIcon (rendering) and FilePage (favicon).
 */
function resolveEmojiSvg(emoji?: string, fileType?: string): string | undefined {
  if (emoji !== undefined && emoji !== "") {
    const svg = EMOJI_SVGS[emoji];
    if (svg !== undefined && svg !== "") {
      return svg;
    }
  }
  if (fileType !== undefined && fileType !== "") {
    const svg = FILE_TYPE_FAVICONS[fileType];
    if (svg !== undefined && svg !== "") {
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
  }
  return undefined;
}

interface EmojiIconProps {
  /** Emoji character to render (may be overridden to a Color icon). */
  emoji?: string;
  /** File type string rendered when no emoji is set. */
  fileType?: FileType;
  /** Fluent React Icon component to render directly (lowest priority). */
  icon?: FC<{ style?: CSSProperties; className?: string }>;
  /** Pixel size or CSS length (e.g. "1.2em") for both the icon and the emoji. Default: 16. */
  size?: number | string;
  className?: string;
}

function EmojiIcon({ emoji, fileType, icon, size = 16, className }: EmojiIconProps): JSX.Element {
  const wrapStyle: CSSProperties = {
    alignItems: "center",
    display: "inline-flex",
    height: size,
    justifyContent: "center",
    width: size,
  };
  // Force the inner SVG/img to fill the wrapper exactly,
  // overriding any hardcoded width/height attributes.
  const innerStyle: CSSProperties = { height: "100%", width: "100%" };

  // Emoji path: check for overrides first
  if (emoji !== undefined && emoji !== "") {
    const svgDataUri = resolveEmojiSvg(emoji);
    if (svgDataUri !== undefined && svgDataUri !== "") {
      return (
        <span style={wrapStyle} className={className}>
          <img
            // oxlint-disable-next-line typescript/no-unsafe-assignment
            src={svgDataUri}
            alt={emoji}
            style={{
              display: "block",
              height: "100%",
              margin: 0,
              width: "100%",
            }}
          />
        </span>
      );
    }
    // Fallback: native text for skin-tone variants, flags, etc. not in the bundle
    return (
      <span
        style={{
          ...wrapStyle,
          fontSize: typeof size === "number" ? size * 0.8 : size,
          lineHeight: 1,
        }}
        className={className}
      >
        {emoji}
      </span>
    );
  }

  // File-type path: resolve icon from central map, fall back to DocumentRegular
  if (fileType) {
    const TypeIcon = FILE_TYPE_ICONS[fileType] ?? QuestionCircle24Color;
    const isMuted = fileType === "code" || fileType === "image";
    return (
      <span style={wrapStyle} className={isMuted ? "text-muted-foreground" : className}>
        <TypeIcon style={innerStyle} />
      </span>
    );
  }

  // Explicit icon path
  if (icon) {
    const Icon = icon;
    return (
      <span style={wrapStyle} className={className}>
        <Icon style={innerStyle} />
      </span>
    );
  }

  return <span style={wrapStyle} className={className} />;
}

// Same emoji regex as rehypeEmojiPlugin; kept here to avoid ui -> editor imports.
const TITLE_EMOJI_RE =
  /(?:[*#0-9]\uFE0F?\u20E3|[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]?(?:\u200D(?:\p{Extended_Pictographic}|\u2640\uFE0F?|\u2642\uFE0F?)[\p{Emoji_Modifier}\uFE0F]?)*)/gu;

/**
 * Renders a plain string with any embedded emoji swapped for <EmojiIcon>.
 * Sizing is relative ("1em") so it matches the surrounding text naturally.
 */
function TitleWithEmoji({ title }: { title: string }): JSX.Element {
  const re = new RegExp(TITLE_EMOJI_RE.source, TITLE_EMOJI_RE.flags);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(title)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={lastIndex}>{title.slice(lastIndex, match.index)}</Fragment>);
    }
    parts.push(
      <EmojiIcon
        key={match.index}
        emoji={match[0]}
        size="1.07lh"
        className="inline align-middle"
      />,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < title.length) {
    parts.push(<Fragment key={lastIndex}>{title.slice(lastIndex)}</Fragment>);
  }
  if (parts.length === 0) {
    return <>{title}</>;
  }
  return <>{parts}</>;
}

export { EmojiIcon, TitleWithEmoji, resolveEmojiSvg };
