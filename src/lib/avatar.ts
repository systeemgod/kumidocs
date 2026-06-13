/**
 * Shared avatar utilities — used by both client components and server auth.
 *
 * These functions are imported by:
 *   - src/server/auth.ts                       (emailToDisplayName for User.displayName)
 *   - src/components/layout/PageInfoPanel.tsx  (commit history avatars)
 *   - src/components/ui/avatar.tsx             (initials fallback when no Gravatar)
 */

/**
 * Derive a display name from an email address.
 * "max.faxalv@example.com" → "Max Faxalv"
 * "max@foorack.com"     → "Max"
 */
const emailToDisplayName = (email: string): string => {
  const local = email.split("@")[0] ?? email;
  return local
    .split(".")
    .map((word) => {
      if (!word) {
        return "";
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .trim();
};

/** Djb2-style hash of name → deterministic HSL background color. */
const avatarColor = (name: string): string => {
  let hash = 1;
  for (let idx = 0; idx < name.length; idx += 1) {
    hash = (name.codePointAt(idx) ?? 0) + hash * 31;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue.toString()}, 60%, 42%)`;
};

/**
 * Returns 1–2 uppercase initials for a display name.
 *
 * - Multi-word  → first char of first word + first char of last word  ("Jane Doe" → "JD")
 * - Single word → first two chars of the word                         ("Foorack"  → "FO")
 */
const avatarInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length >= 2) {
    const firstPart = parts.at(0) ?? "?";
    const lastPart = parts.at(-1) ?? "?";
    return (firstPart.charAt(0) + lastPart.charAt(0)).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
};

export { emailToDisplayName, avatarColor, avatarInitials };
