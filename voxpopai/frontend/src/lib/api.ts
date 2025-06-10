// Lightweight fetch helper (re-added after cleanup)

const defaultBase = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

export function useApi(baseUrl: string = defaultBase) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
  return { request };
} 