import React from "react";
import { useAuth } from "react-oidc-context";

export default function Login() {
  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "";
    const logoutUri = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    if (!cognitoDomain || !clientId) {
      auth.removeUser();
      window.location.href = logoutUri;
      return;
    }
    auth.removeUser();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (auth.error) {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        Encountering error... {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Welcome!</h1>
        <pre>Email: {auth.user?.profile.email}</pre>
        <button onClick={() => auth.removeUser()}>Sign out (local only)</button>
        <button onClick={signOutRedirect}>Sign out (Cognito)</button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Login</h1>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
    </main>
  );
} 