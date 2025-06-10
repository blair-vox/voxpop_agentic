import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: Error | null;
  login: () => void;
  logout: () => Promise<void>;
}

const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
  login: () => {
    // Redirect to Cognito hosted-UI via ALB default path
    window.location.href = "/oauth2/idpresponse"; // ALB will route correctly
  },
  logout: async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");
      const r = await fetch(`${apiBase}/api/auth/logout`);
      const data = await r.json();
      window.location.href = data.logout_url || "/";
    } catch {
      window.location.href = "/";
    }
  },
};

const AuthCtx = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");
      const res = await fetch(`${apiBase}/api/auth/status`, { credentials: "include" });
      const data = await res.json();
      setState((s) => ({
        ...s,
        isAuthenticated: !!data.authenticated,
        user: data.user,
        isLoading: false,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const ctxValue: AuthState = {
    ...state,
    login: defaultState.login,
    logout: defaultState.logout,
  };

  return <AuthCtx.Provider value={ctxValue}>{children}</AuthCtx.Provider>;
}

export function useALBAuth() {
  return useContext(AuthCtx);
}

export const useAuth = useALBAuth; 