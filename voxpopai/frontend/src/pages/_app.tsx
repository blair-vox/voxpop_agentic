// index.js
import React from "react";
import type { AppProps } from "next/app";
import { AuthProvider } from "react-oidc-context";
import AuthStatusBar from "../components/AuthStatusBar";

// Build config from environment variables set in .env.local
const poolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID ?? ""; // e.g. ap-southeast-2_XXXXXXXXX
const region = poolId.split("_")[0] || "ap-southeast-2";

const cognitoAuthConfig = {
  authority: `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  response_type: "code",
  scope: "openid email phone",
  post_logout_redirect_uri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
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