import React from "react";
import type { AppProps } from "next/app";
import { ALBAuthProvider } from "../lib/albAuth";
import AuthStatusBar from "../components/AuthStatusBar";

// Build config from environment variables set in .env.local
const poolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID ?? ""; // e.g. ap-southeast-2_XXXXXXXXX
const region = poolId.split("_")[0] || "ap-southeast-2";

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_COGNITO_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_POOL_ID,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars);
}

// For debugging
console.log("Auth Config Debug:");
console.log("NEXT_PUBLIC_COGNITO_POOL_ID:", process.env.NEXT_PUBLIC_COGNITO_POOL_ID);
console.log("NEXT_PUBLIC_COGNITO_CLIENT_ID:", process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID);
console.log("NEXT_PUBLIC_COGNITO_DOMAIN:", process.env.NEXT_PUBLIC_COGNITO_DOMAIN);
console.log("Origin:", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

function MyApp({ Component, pageProps }: AppProps) {
  // Validate configuration before rendering
  if (typeof window !== "undefined") {
    console.log("Current auth configuration:", {
      authority: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? `https://cognito-idp.${region}.amazonaws.com/${poolId}`,
      client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
      redirect_uri: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      scope: "openid email phone"
    });
  }

  return (
    <ALBAuthProvider>
      <AuthStatusBar />
      <Component {...pageProps} />
    </ALBAuthProvider>
  );
}

export default MyApp;
