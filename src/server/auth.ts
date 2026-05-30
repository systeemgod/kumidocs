import type { SlideThemeMap } from "@/lib/slide";
import type { User } from "@/lib/types";
import { emailToDisplayName } from "@/lib/avatar";

interface KumiDocsPermissions {
  instanceName?: string;
  editors?: string[];
  slideThemes?: SlideThemeMap;
}

let perms: KumiDocsPermissions = {};

const setPermissions = (permissions: KumiDocsPermissions): void => {
  perms = permissions;
};

const getPermissions = (): KumiDocsPermissions => perms;

/** Parse the `kumidocs_email` cookie value from a Cookie header string. */
const cookieEmail = (cookieHeader: string | null): string | undefined => {
  if (cookieHeader === null || cookieHeader === "") {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...cookieValueParts] = part.trim().split("=");
    if (cookieName?.trim() === "kumidocs_email") {
      const raw = decodeURIComponent(cookieValueParts.join("=").trim());
      if (raw !== "") {
        return raw;
      }
    }
  }
  return undefined;
};

interface JWTPayload {
  email?: string;
  preferred_username?: string;
}

const JWT_SEGMENT_COUNT = 3;

/** Decode an email string from a raw auth header value (JWT or plain string). Returns undefined if JWT has no email claim. */
const resolveEmail = (value: string): string | undefined => {
  const parts = value.split(".");
  if (parts.length === JWT_SEGMENT_COUNT) {
    try {
      const base64 = (parts.at(1) ?? "").replaceAll("-", "+").replaceAll("_", "/");
      // Base64url omits padding, but atob() requires length % 4 === 0.
      // Pad to a multiple of 4 so short payloads don't throw.
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const payload = JSON.parse(atob(padded)) as unknown as JWTPayload;
      const raw = payload.email ?? payload.preferred_username;
      // JWT present but no usable email claim
      if (raw === undefined || raw === "") {
        return undefined;
      }
      return raw.trim().toLowerCase();
    } catch {
      // Fall through to plain string handling
    }
  }
  return value.trim().toLowerCase();
};

const parseUser = (headers: Headers, authHeader: string): User | undefined => {
  // Check the configured auth header first. If absent or empty, fall through
  // to the kumidocs_email cookie (used when no SSO proxy is present).
  const headerVal = headers.get(authHeader);
  const value =
    headerVal !== null && headerVal !== "" && headerVal.trim() !== ""
      ? headerVal
      : cookieEmail(headers.get("cookie"));
  if (value === undefined || value === "") {
    return undefined;
  }

  const email = resolveEmail(value);
  if (email === undefined || email === "") {
    return undefined;
  }

  const displayName = emailToDisplayName(email);
  const editors = perms.editors ?? [];

  // If no editors configured at all, everyone can edit
  const canEdit = editors.length === 0 || editors.includes(email);

  return { canEdit, displayName, email, id: email, name: displayName };
};

export type { KumiDocsPermissions };
export { setPermissions, getPermissions, parseUser };
