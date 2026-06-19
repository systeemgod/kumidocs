import { ApiError, getMe, setAuthEmail } from "@/lib/api";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { SlideThemeMap } from "@/lib/slide";
import type { User } from "@/lib/types";
import useMountEffect from "@/hooks/use-mount-effect";

const HTTP_UNAUTHORIZED = 401;

interface UserContextValue {
  user?: User;
  loading: boolean;
  needsEmailSetup: boolean;
  sidebarDefaultDepth: number;
  slideThemes: SlideThemeMap;
  refreshUser: () => Promise<void>;
  setEmailAndRefetch: (email: string) => void;
}

const UserContext = createContext<UserContextValue>({
  loading: true,
  needsEmailSetup: false,
  refreshUser: async () => {
    /* noop until provider mounts */
  },
  setEmailAndRefetch: () => {
    globalThis.location.reload();
  },
  sidebarDefaultDepth: 2,
  slideThemes: {},
});

interface FetchMeResult {
  user?: User;
  sidebarDefaultDepth: number;
  slideThemes: SlideThemeMap;
  needs401: boolean;
}

const fetchMe = async (): Promise<FetchMeResult> => {
  try {
    const data = await getMe();
    const {
      id,
      email,
      name,
      displayName,
      canEdit,
      slideThemes: themeData,
      sidebarDefaultDepth,
    } = data;
    const user: User = { canEdit, displayName, email, id, name };
    return {
      needs401: false,
      sidebarDefaultDepth: sidebarDefaultDepth ?? 2,
      slideThemes: themeData ?? {},
      user,
    };
  } catch (error: unknown) {
    const needs401 = error instanceof ApiError && error.status === HTTP_UNAUTHORIZED;
    return { needs401, sidebarDefaultDepth: 2, slideThemes: {} };
  }
};

const UserProvider = (allProps: { children: ReactNode }): JSX.Element => {
  const { children } = allProps;
  const [user, setUser] = useState<User | undefined>();
  const [loading, setLoading] = useState(true);
  const [needsEmailSetup, setNeedsEmailSetup] = useState(false);
  const [slideThemes, setSlideThemes] = useState<SlideThemeMap>({});
  const [sidebarDefaultDepth, setSidebarDefaultDepth] = useState(2);

  useMountEffect(() => {
    void (async (): Promise<void> => {
      try {
        const {
          user: fetchedUser,
          slideThemes: fetchedThemes,
          needs401,
          sidebarDefaultDepth: fetchedDepth,
        } = await fetchMe();
        setUser(fetchedUser);
        setSlideThemes(fetchedThemes);
        setSidebarDefaultDepth(fetchedDepth);
        setNeedsEmailSetup(needs401);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  });

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const {
        user: fetchedUser,
        slideThemes: fetchedThemes,
        needs401,
        sidebarDefaultDepth: fetchedDepth,
      } = await fetchMe();
      setUser(fetchedUser);
      setSlideThemes(fetchedThemes);
      setSidebarDefaultDepth(fetchedDepth);
      setNeedsEmailSetup(needs401);
    } catch {
      // keep current state
    }
  }, []);

  const setEmailAndRefetch = useCallback(async (email: string): Promise<void> => {
    const trimmed = email.trim().toLowerCase();
    // Basic validation: must look like an email address.
    // The UI dialog also validates, but this guard prevents storing
    // garbage if called programmatically.
    if (!trimmed.includes("@") || trimmed.startsWith("@") || trimmed.endsWith("@")) {
      return;
    }
    try {
      const data = await setAuthEmail(trimmed);
      const {
        id,
        email: userEmail,
        name,
        displayName,
        canEdit,
        slideThemes: themeData,
        sidebarDefaultDepth: fetchedDepth,
      } = data;
      const parsedUser: User = { canEdit, displayName, email: userEmail, id, name };
      setUser(parsedUser);
      setSlideThemes(themeData ?? {});
      setSidebarDefaultDepth(fetchedDepth ?? 2);
      setNeedsEmailSetup(false);
    } catch {
      // Server rejected the email — keep the dialog open
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        loading,
        needsEmailSetup,
        refreshUser,
        setEmailAndRefetch,
        sidebarDefaultDepth,
        slideThemes,
        user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

const useUser = (): UserContextValue => useContext(UserContext);

export type { UserContextValue };
export { UserProvider, useUser };
