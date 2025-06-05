import { useALBAuth } from './albAuth';

export function useApi(baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000") {
  const auth = useALBAuth();

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Debug logging
    console.log("[useApi] Auth state:", {
      isAuthenticated: auth.isAuthenticated,
      hasUser: !!auth.user,
      isLoading: auth.isLoading,
      error: auth.error?.message
    });

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Log request details
    console.log("[useApi] Making request:", {
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      headers: headers
    });

    const res = await fetch(`${baseUrl}${path}`, { 
      ...options, 
      headers,
      credentials: 'include' // Important for ALB auth
    });
    
    // Log response details
    console.log("[useApi] Response:", {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[useApi] Request failed:", {
        status: res.status,
        statusText: res.statusText,
        error: errorText
      });
      throw new Error(errorText);
    }
    
    return res.json() as Promise<T>;
  }

  return { request };
} 