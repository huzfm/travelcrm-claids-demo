'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, createContext, useContext, useEffect, ReactNode } from 'react';
import { setToken, setCurrentUser, User } from '@/lib/auth';
import { SESSION_EXPIRED_EVENT, ensureValidSession, forceLogout } from '@/lib/axios';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

interface LoginResult {
  requiresOTP?: boolean;
  message?: string;
  data?: {
    accessToken: string;
    user: User;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  setAuthFromToken: (accessToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: () => {},
  login: async () => ({ requiresOTP: false }),
  setAuthFromToken: () => {},
  logout: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('crm_user');
    const token = localStorage.getItem('crm_token');
    if (!stored || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
      setIsLoading(false);
      return;
    }

    let parsed: User;
    try {
      parsed = JSON.parse(stored);
    } catch {
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_token');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // A cached token is not a session. Prove it is still usable *before*
      // reporting the user as authenticated, otherwise the dashboard renders
      // against a dead token and every panel fails to load.
      setToken(token);
      const valid = await ensureValidSession();
      if (cancelled) return;

      if (!valid) {
        // ensureValidSession cleared storage and started the redirect to /login.
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(parsed);
      setIsLoading(false);

      // The cached copy can be out of date — most importantly its feature
      // permissions, which an admin may have changed since the last sign-in.
      // Re-read the user so the sidebar matches what the API will actually
      // allow. A 401 here means the session was revoked, and the axios
      // interceptor takes us to the login page.
      try {
        const { getMe } = await import('@/lib/auth');
        const response = await getMe();
        const fresh = response.data?.data;
        if (!cancelled && fresh) {
          setCurrentUser(fresh);
          setUser(fresh);
        }
      } catch {
        // Offline: keep showing the cached user. Auth failures are not swallowed
        // here — the interceptor has already forced a logout.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Anything in the app can declare the session dead (an unrefreshable 401, a
  // revoked account). Drop React state so nothing keeps rendering behind the
  // redirect that is already under way.
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  // An open tab must not sit on a dashboard whose token died while it was idle:
  // re-check on a timer and whenever the tab comes back to the front.
  useEffect(() => {
    if (!user) return;

    const check = () => {
      void ensureValidSession();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };
    // Signing out in another tab clears the shared token.
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'crm_token' && !event.newValue) forceLogout('expired');
    };

    const interval = window.setInterval(check, 60 * 1000);
    window.addEventListener('focus', check);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const { login: loginApi } = await import('@/lib/auth');
    const response = await loginApi({ email, password });

    // Check if OTP verification is required
    if (response.data.requiresOTP) {
      return {
        requiresOTP: true,
        message: response.data.message,
      };
    }

    // Direct login (no OTP required - user has no phone)
    if (response.data.data) {
      const { accessToken, user: userData } = response.data.data;
      setToken(accessToken);
      setCurrentUser(userData);
      setUser(userData);
    }

    return { requiresOTP: false };
  };

  const setAuthFromToken = (accessToken: string, userData: User) => {
    setToken(accessToken);
    setCurrentUser(userData);
    setUser(userData);
  };

  const logout = () => {
    // Drop the server-side refresh token too, so the session cannot be resumed
    // from the cookie. The redirect does not wait on the request.
    void import('@/lib/auth').then(({ logout: logoutApi }) => logoutApi()).catch(() => {});

    setToken(null);
    setCurrentUser(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, setUser, login, setAuthFromToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // A 401 is never worth retrying — the interceptor has already tried
            // a refresh and given up, so retrying only delays the redirect. The
            // same goes for a request the interceptor cancelled outright.
            retry: (failureCount, error) => {
              const err = error as { response?: { status?: number }; name?: string };
              if (err?.name === 'CanceledError') return false;
              const status = err?.response?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
