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
  login: (googleCredential: string) => Promise<void>;
  logout: () => Promise<void>;
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
        // Get new access token
        const refreshResponse = await api.post("/api/auth/refresh", {
          refresh_token: refreshToken,
        });
        setAccessToken(refreshResponse.data.access_token);

        // Fetch user profile
        const meResponse = await api.get("/api/auth/me");
        setState({
          user: meResponse.data,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        // Refresh failed — clear everything
        localStorage.removeItem("synthflow_refresh_token");
        setAccessToken(null);
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (googleCredential: string) => {
    const response = await api.post("/api/auth/google", {
      credential: googleCredential,
    });

    const { access_token, refresh_token, user } = response.data;

    // Store tokens
    setAccessToken(access_token);
    localStorage.setItem("synthflow_refresh_token", refresh_token);

    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("synthflow_refresh_token");

    try {
      if (refreshToken) {
        await api.post("/api/auth/logout", {
          refresh_token: refreshToken,
        });
      }
    } catch {
      // Logout API failure is non-critical — proceed with local cleanup
    }

    setAccessToken(null);
    localStorage.removeItem("synthflow_refresh_token");
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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
