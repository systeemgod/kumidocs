import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';
import { type SlideThemeMap } from '@/lib/slide';
import { type User } from '@/lib/types';
import { useMountEffect } from '@/hooks/useMountEffect';

const HTTP_UNAUTHORIZED = 401;

interface UserContextValue {
	user?: User;
	loading: boolean;
	needsEmailSetup: boolean;
	slideThemes: SlideThemeMap;
	setEmailAndRefetch: (email: string) => void;
}

const UserContext = createContext<UserContextValue>({
	loading: true,
	needsEmailSetup: false,
	slideThemes: {},
	setEmailAndRefetch: () => { globalThis.location.reload(); },
});

interface MeResponse extends User {
	instanceName?: string;
	autoSaveDelay?: number;
	slideThemes?: SlideThemeMap;
}

interface FetchMeResult {
	user?: User;
	slideThemes: SlideThemeMap;
	needs401: boolean;
}

const handleFetchError = (err: unknown): FetchMeResult => {
	const needs401 = (err as { status?: number }).status === HTTP_UNAUTHORIZED;
	return { slideThemes: {}, needs401 };
};

const parseData = (data: MeResponse): FetchMeResult => {
	const { id, email, name, displayName, canEdit, slideThemes: themeData } = data;
	const user: User = { id, email, name, displayName, canEdit };
	return { user, slideThemes: themeData ?? {}, needs401: false };
};

const handleHttpResponse = (response: Response): Response => {
	if (response.status === HTTP_UNAUTHORIZED) {
		throw Object.assign(new Error('unauthorized'), { status: HTTP_UNAUTHORIZED });
	}
	if (!response.ok) { throw new Error('request failed'); }
	return response;
};

const fetchMe = (): Promise<FetchMeResult> =>
	fetch('/api/me')
		.then(handleHttpResponse)
		.then((response) => response.json() as Promise<MeResponse>)
		.then(parseData)
		.catch(handleFetchError);

const UserProvider = (allProps: { children: ReactNode }): JSX.Element => {
	const { children } = allProps;
	const [user, setUser] = useState<User | undefined>();
	const [loading, setLoading] = useState(true);
	const [needsEmailSetup, setNeedsEmailSetup] = useState(false);
	const [slideThemes, setSlideThemes] = useState<SlideThemeMap>({});

	useMountEffect(() => {
		fetchMe().then(({ user: fetchedUser, slideThemes: fetchedThemes, needs401 }) => {
			setUser(fetchedUser);
			setSlideThemes(fetchedThemes);
			setNeedsEmailSetup(needs401);
			return setLoading(false);
		}).catch(() => setLoading(false));
	});

	const setEmailAndRefetch = useCallback((email: string): void => {
		globalThis.cookieStore.set({
			name: 'kumidocs_email',
			value: encodeURIComponent(email.trim().toLowerCase()),
			path: '/',
			sameSite: 'lax',
		}).then(() => globalThis.location.reload()).catch(() => globalThis.location.reload());
	}, []);

	return (
		<UserContext.Provider value={{ user, loading, needsEmailSetup, slideThemes, setEmailAndRefetch }}>
			{children}
		</UserContext.Provider>
	);
};

const useUser = (): UserContextValue => useContext(UserContext);

export type { UserContextValue };
export { UserProvider, useUser };
