import React, { createContext, useContext, useEffect, useState } from 'react';

interface ALBAuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: Error | null;
}

const ALBAuthContext = createContext<ALBAuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
});

export function ALBAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        // The ALB will handle authentication and add user info in headers
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Important for ALB auth
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // If not authenticated, ALB will redirect to Cognito
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Authentication check failed'));
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return (
    <ALBAuthContext.Provider value={{ isAuthenticated, user, isLoading, error }}>
      {children}
    </ALBAuthContext.Provider>
  );
}

export function useALBAuth() {
  return useContext(ALBAuthContext);
} 