import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

export default function DebugPage() {
  const auth = useAuth();
  const [authState, setAuthState] = useState<any>({});
  const [authSettings, setAuthSettings] = useState<any>({});
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  useEffect(() => {
    // Capture auth state
    setAuthState({
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      user: auth.user ? {
        profile: auth.user.profile,
        expires_at: auth.user.expires_at,
        scope: auth.user.scope,
      } : null,
      error: auth.error ? {
        message: auth.error.message,
        name: auth.error.name,
      } : null,
    });

    // Capture auth settings
    if (auth.settings) {
      setAuthSettings({
        authority: auth.settings.authority,
        client_id: auth.settings.client_id,
        redirect_uri: auth.settings.redirect_uri,
        response_type: auth.settings.response_type,
        scope: auth.settings.scope,
        automaticSilentRenew: auth.settings.automaticSilentRenew,
        loadUserInfo: auth.settings.loadUserInfo,
      });
    }

    // Generate the redirect URL that would be used
    if (auth.settings && typeof window !== "undefined") {
      try {
        const params = new URLSearchParams({
          client_id: auth.settings.client_id || "",
          redirect_uri: auth.settings.redirect_uri || window.location.origin,
          response_type: auth.settings.response_type || "code",
          scope: auth.settings.scope || "openid",
          state: "debug-state-" + Math.random().toString(36).substring(2, 15),
        });
        
        // Add PKCE parameters if using authorization code flow
        if (auth.settings.response_type === "code") {
          params.append("code_challenge", "debug_challenge_value");
          params.append("code_challenge_method", "S256");
        }
        
        const authority = auth.settings.authority || "";
        const url = `${authority}/oauth2/authorize?${params.toString()}`;
        setRedirectUrl(url);
      } catch (error) {
        console.error("Error generating redirect URL:", error);
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, auth.error, auth.settings]);

  const handleManualSignIn = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  const handleSignInWithLibrary = () => {
    auth.signinRedirect().catch(err => {
      console.error("Error during sign-in redirect:", err);
    });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Auth Debug Page</h1>
      
      <h2>Environment Variables</h2>
      <pre>
        NEXT_PUBLIC_COGNITO_POOL_ID: {process.env.NEXT_PUBLIC_COGNITO_POOL_ID || "not set"}<br />
        NEXT_PUBLIC_COGNITO_CLIENT_ID: {process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "not set"}<br />
        NEXT_PUBLIC_COGNITO_DOMAIN: {process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "not set"}<br />
        Origin: {typeof window !== "undefined" ? window.location.origin : "not available"}
      </pre>
      
      <h2>Auth State</h2>
      <pre>{JSON.stringify(authState, null, 2)}</pre>
      
      <h2>Auth Settings</h2>
      <pre>{JSON.stringify(authSettings, null, 2)}</pre>
      
      <h2>Generated Redirect URL</h2>
      <pre style={{ wordBreak: "break-all" }}>{redirectUrl}</pre>
      
      <h2>Actions</h2>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button 
          onClick={handleSignInWithLibrary}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px" }}
        >
          Sign In (Using Library)
        </button>
        
        <button 
          onClick={handleManualSignIn}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "4px" }}
        >
          Sign In (Manual Redirect)
        </button>
        
        <button 
          onClick={() => auth.removeUser()}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "4px" }}
        >
          Sign Out (Local Only)
        </button>
      </div>
    </div>
  );
}
