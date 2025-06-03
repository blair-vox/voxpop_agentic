import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export default function AuthStatusBar() {
  const auth = useAuth();

  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
  const logoutUri = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  // Add debug logging for auth state changes
  useEffect(() => {
    console.log("Auth state:", {
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      user: auth.user,
      error: auth.error ? {
        message: auth.error.message,
        name: auth.error.name,
        stack: auth.error.stack
      } : null
    });
    
    if (auth.error) {
      console.error("Authentication error:", auth.error);
    }
    
    if (auth.user) {
      console.log("Authenticated user:", auth.user.profile);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, auth.error]);

  const signOutRedirect = () => {
    console.log("Signing out with redirect to:", logoutUri);
    console.log("Using Cognito domain:", cognitoDomain);
    console.log("Using client ID:", clientId);
    
    if (!cognitoDomain || !clientId) {
      // Fallback: clear local session only
      console.log("Missing Cognito domain or client ID, using local signout only");
      auth.removeUser();
      window.location.href = logoutUri;
      return;
    }
    auth.removeUser();
    const logoutUrl = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    console.log("Redirecting to logout URL:", logoutUrl);
    window.location.href = logoutUrl;
  };

  const handleSignIn = () => {
    console.log("Initiating sign-in redirect");
    console.log("Current auth config:", {
      authority: auth.settings.authority,
      client_id: auth.settings.client_id,
      redirect_uri: auth.settings.redirect_uri,
      response_type: auth.settings.response_type,
      scope: auth.settings.scope
    });
    
    try {
      auth.signinRedirect().catch(err => {
        console.error("Error during sign-in redirect:", err);
      });
    } catch (error) {
      console.error("Exception during sign-in redirect:", error);
    }
  };

  const barStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 1rem",
    backgroundColor: "#f5f5f5",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: "sans-serif",
    fontSize: "0.9rem",
  };

  return (
    <div style={barStyle}>
      <span>
        {auth.isAuthenticated ? `Signed in as ${auth.user?.profile.email}` : "Not signed in"}
        {auth.isLoading && " (Loading...)"}
        {auth.error && ` (Error: ${auth.error.message})`}
      </span>
      <div>
        {auth.isAuthenticated ? (
          <button onClick={signOutRedirect} style={{ padding: "0.25rem 0.75rem" }}>
            Sign out
          </button>
        ) : (
          <button onClick={handleSignIn} style={{ padding: "0.25rem 0.75rem" }}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );
} 