// index.js
import React from "react";
import type { AppProps } from "next/app";
import { AuthProvider } from "react-oidc-context";
import AuthStatusBar from "../components/AuthStatusBar";

// Build config from environment variables set in .env.local
const poolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID ?? ""; // e.g. ap-southeast-2_XXXXXXXXX
const region = poolId.split("_")[0] || "ap-southeast-2";

// For debugging
console.log("Auth Config Debug:");
console.log("NEXT_PUBLIC_COGNITO_POOL_ID:", process.env.NEXT_PUBLIC_COGNITO_POOL_ID);
console.log("NEXT_PUBLIC_COGNITO_CLIENT_ID:", process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID);
console.log("NEXT_PUBLIC_COGNITO_DOMAIN:", process.env.NEXT_PUBLIC_COGNITO_DOMAIN);
console.log("Origin:", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  response_type: "code",
  scope: "openid email phone",
  post_logout_redirect_uri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  automaticSilentRenew: true,
  loadUserInfo: true,
  
  // Add detailed logging for debugging
  monitorSession: true,
  onSigninCallback: (user: any) => {
    console.log("Sign-in callback triggered:", user ? "User authenticated" : "No user");
    if (user) {
      console.log("User profile:", user.profile);
    }
    // Return void instead of boolean
    return;
  },
  onSignoutCallback: () => {
    console.log("Sign-out callback triggered");
    // Return void instead of boolean
    return;
  },
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider {...cognitoAuthConfig}>
      <AuthStatusBar />
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
