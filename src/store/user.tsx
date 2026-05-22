import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { SlideThemeMap } from "@/lib/slide";
import type { User } from "@/lib/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

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
  setEmailAndRefetch: () => {
    globalThis.location.reload();
  },
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

const handleFetchError = (error: unknown): FetchMeResult => {
  const needs401 = (error as { status?: number }).status === HTTP_UNAUTHORIZED;
  return { slideThemes: {}, needs401 };
};

const parseData = (data: MeResponse): FetchMeResult => {
  const { id, email, name, displayName, canEdit, slideThemes: themeData } = data;
  const user: User = { id, email, name, displayName, canEdit };
  return { user, slideThemes: themeData ?? {}, needs401: false };
};

const handleHttpResponse = (response: Response): Response => {
  if (response.status === HTTP_UNAUTHORIZED) {
    throw Object.assign(new Error("unauthorized"), { status: HTTP_UNAUTHORIZED });
  }
  if (!response.ok) {
    throw new Error("request failed");
  }
  return response;
};

const fetchMe = async (): Promise<FetchMeResult> => {
  try {
    const response = handleHttpResponse(await fetch("/api/me"));
    const data = await (response.json() as Promise<MeResponse>);
    return parseData(data);
  } catch (error: unknown) {
    return handleFetchError(error);
  }
};

const UserProvider = (allProps: { children: ReactNode }): JSX.Element => {
  const { children } = allProps;
  const [user, setUser] = useState<User | undefined>();
  const [loading, setLoading] = useState(true);
  const [needsEmailSetup, setNeedsEmailSetup] = useState(false);
  const [slideThemes, setSlideThemes] = useState<SlideThemeMap>({});

  useMountEffect(() => {
    void (async () => {
      try {
        const { user: fetchedUser, slideThemes: fetchedThemes, needs401 } = await fetchMe();
        setUser(fetchedUser);
        setSlideThemes(fetchedThemes);
        setNeedsEmailSetup(needs401);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  });

  const setEmailAndRefetch = useCallback(async (email: string): Promise<void> => {
    try {
      await globalThis.cookieStore.set({
        name: "kumidocs_email",
        value: encodeURIComponent(email.trim().toLowerCase()),
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // ignore — reload regardless
    }
    globalThis.location.reload();
  }, []);

  return (
    <UserContext.Provider
      value={{ user, loading, needsEmailSetup, slideThemes, setEmailAndRefetch }}
    >
      {children}
    </UserContext.Provider>
  );
};

const useUser = (): UserContextValue => useContext(UserContext);

export type { UserContextValue };
export { UserProvider, useUser };
