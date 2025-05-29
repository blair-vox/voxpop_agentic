import React from "react";
import { useAuth } from "react-oidc-context";

export default function AuthStatusBar() {
  const auth = useAuth();

  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
  const logoutUri = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const signOutRedirect = () => {
    if (!cognitoDomain || !clientId) {
      // Fallback: clear local session only
      auth.removeUser();
      window.location.href = logoutUri;
      return;
    }
    auth.removeUser();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
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
      </span>
      <div>
        {auth.isAuthenticated ? (
          <button onClick={signOutRedirect} style={{ padding: "0.25rem 0.75rem" }}>
            Sign out
          </button>
        ) : (
          <button onClick={() => auth.signinRedirect()} style={{ padding: "0.25rem 0.75rem" }}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );
} 