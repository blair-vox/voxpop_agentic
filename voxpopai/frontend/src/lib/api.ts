import { useAuth } from "react-oidc-context";

export function useApi(baseUrl = "http://localhost:8000") {
  const auth = useAuth();

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = auth.user?.access_token ?? auth.user?.id_token;
    if (!token && auth.isAuthenticated) {
      console.warn("[useApi] No access token found while authenticated; user object:", auth.user);
    }
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  return { request };
} 