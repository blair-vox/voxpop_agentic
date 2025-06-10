import React from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/albAuth';
import AuthStatusBar from '../components/AuthStatusBar';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthStatusBar />
      <Component {...pageProps} />
    </AuthProvider>
  );
} 