import { type SlideThemeMap } from '@/lib/slide';
import { type User } from '@/lib/types';
import { emailToDisplayName } from '@/lib/avatar';

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
	if (!cookieHeader) { return; }
	for (const part of cookieHeader.split(';')) {
		const [cookieName, ...cookieValueParts] = part.trim().split('=');
		if (cookieName && cookieName.trim() === 'kumidocs_email') {
			const raw = decodeURIComponent(cookieValueParts.join('=').trim());
			if (raw) { return raw; }
		}
	}
};

interface JWTPayload {
	email?: string;
	preferred_username?: string;
}

const JWT_SEGMENT_COUNT = 3;

/** Decode an email string from a raw auth header value (JWT or plain string). Returns undefined if JWT has no email claim. */
const resolveEmail = (value: string): string | undefined => {
	const parts = value.split('.');
	if (parts.length === JWT_SEGMENT_COUNT) {
		try {
			const paddedPart = (parts.at(1) ?? '').replaceAll('-', '+').replaceAll('_', '/');
			const payload = JSON.parse(atob(paddedPart)) as JWTPayload;
			const raw = payload.email ?? payload.preferred_username;
			// JWT present but no usable email claim
			if (!raw) { return; }
			return raw.trim().toLowerCase();
		} catch {
			// Fall through to plain string handling
		}
	}
	return value.trim().toLowerCase();
};

const parseUser = (headers: Headers, authHeader: string): User | undefined => {
	const value = headers.get(authHeader) ?? cookieEmail(headers.get('cookie'));
	if (!value) { return; }

	const email = resolveEmail(value);
	if (!email) { return; }

	const displayName = emailToDisplayName(email);
	const editors = perms.editors ?? [];

	// If no editors configured at all, everyone can edit
	const canEdit = editors.length === 0 || editors.includes(email);

	return { id: email, email, name: displayName, displayName, canEdit };
};

export type { KumiDocsPermissions };
export { setPermissions, getPermissions, parseUser };

