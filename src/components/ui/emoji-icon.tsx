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
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const svgDataUri = EMOJI_SVGS[emoji];
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

export { EmojiIcon, TitleWithEmoji };
