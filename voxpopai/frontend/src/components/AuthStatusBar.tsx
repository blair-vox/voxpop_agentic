import React from "react";
import { useAuth } from "../lib/albAuth";

export default function AuthStatusBar() {
  const auth = useAuth();

  if (auth.isLoading) return null;

  const style: React.CSSProperties = {
    padding: "0.25rem 0.75rem",
    fontSize: "0.875rem",
    background: "#f3f4f6",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "0.5rem",
  };

  const linkStyle: React.CSSProperties = {
    cursor: "pointer",
    color: "#2563eb",
    textDecoration: "underline",
  };

  return (
    <div style={style}>
      {auth.isAuthenticated ? (
        <>
          <span>
            Logged in as {auth.user?.name || auth.user?.email || auth.user?.username || "User"}
          </span>
          <span style={linkStyle} onClick={() => auth.logout()}>
            Sign out
          </span>
        </>
      ) : (
        <span style={linkStyle} onClick={() => auth.login()}>
          Sign in
        </span>
      )}
    </div>
  );
} 