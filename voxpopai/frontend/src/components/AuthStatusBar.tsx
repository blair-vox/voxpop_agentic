import React from 'react';
import { useALBAuth } from '../lib/albAuth';

export default function AuthStatusBar() {
  const auth = useALBAuth();

  const handleSignOut = async () => {
    try {
      // ALB will handle the sign-out redirect
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (auth.isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (auth.error) {
    return <div>Error: {auth.error.message}</div>;
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f0f0f0' }}>
      {auth.isAuthenticated ? (
        <div>
          <span>Logged in as: {auth.user?.email || 'User'}</span>
          <button onClick={handleSignOut} style={{ marginLeft: '1rem' }}>
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <span>Not logged in</span>
          <button 
            onClick={() => window.location.href = '/api/auth/login'} 
            style={{ marginLeft: '1rem' }}
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
} 