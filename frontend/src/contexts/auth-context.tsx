// frontend/src/contexts/auth-context.tsx

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api, { setAccessToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  /** Sign in with a Google ID token */
  login: (googleCredential: string) => Promise<void>;
  /** Sign in with email + password */
  loginWithEmail: (email: string, password: string) => Promise<void>;
  /**
   * Register a new account.
   * Returns true when the account needs email verification before signing in.
   */
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ needsVerification: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount — try refreshing the token
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem("synthflow_refresh_token");
      if (!refreshToken) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        const refreshResponse = await api.post("/api/auth/refresh", {
          refresh_token: refreshToken,
        });
        setAccessToken(refreshResponse.data.access_token);

        const meResponse = await api.get("/api/auth/me");
        setState({
          user: meResponse.data,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem("synthflow_refresh_token");
        setAccessToken(null);
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    restoreSession();
  }, []);

  /** Shared helper — store tokens and set auth state after a successful auth response */
  const _applyAuthResponse = useCallback(
    (data: { access_token: string; refresh_token: string; user: User }) => {
      setAccessToken(data.access_token);
      localStorage.setItem("synthflow_refresh_token", data.refresh_token);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    },
    [],
  );

  const login = useCallback(
    async (googleCredential: string) => {
      const response = await api.post("/api/auth/google", {
        credential: googleCredential,
      });
      _applyAuthResponse(response.data);
    },
    [_applyAuthResponse],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const response = await api.post("/api/auth/login", { email, password });
      _applyAuthResponse(response.data);
    },
    [_applyAuthResponse],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<{ needsVerification: boolean }> => {
      await api.post("/api/auth/register", { name, email, password });
      // Registration always requires email verification before sign-in
      return { needsVerification: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("synthflow_refresh_token");
    try {
      if (refreshToken) {
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      }
    } catch {
      // Non-critical — proceed with local cleanup
    }
    setAccessToken(null);
    localStorage.removeItem("synthflow_refresh_token");
    setState({ user: null, isLoading: false, isAuthenticated: false });

    if (typeof window !== "undefined") {
      window.location.replace(window.location.origin + "/");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const meResponse = await api.get("/api/auth/me");
      setState((prev) => ({ ...prev, user: meResponse.data }));
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, loginWithEmail, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
