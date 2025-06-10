import { createContext, useContext } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: Error | null;
}

// Local-dev stub – always unauthenticated
const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
};

const AuthCtx = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthCtx.Provider value={defaultState}>{children}</AuthCtx.Provider>;
}

export function useALBAuth() {
  return useContext(AuthCtx);
}

export const useAuth = useALBAuth; 