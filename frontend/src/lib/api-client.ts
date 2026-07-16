// Typed API client — single file, ~50 lines
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request<T>(method: HttpMethod, path: string, config?: RequestConfig): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (config?.params) {
    Object.entries(config.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...config?.headers,
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: config?.body ? JSON.stringify(config.body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") localStorage.removeItem("auth_token");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }

    // Safety check for detail object vs string
    let errorMsg = res.statusText;
    try {
      const errData = await res.json();
      if (errData.detail) {
        if (typeof errData.detail === "string") {
          errorMsg = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          // FastAPI validation error (Array)
          errorMsg = errData.detail.map((e: any) => `${e.loc?.join(".")}: ${e.msg}`).join(", ");
        } else if (typeof errData.detail === "object") {
          errorMsg = JSON.stringify(errData.detail);
        }
      } else if (errData.message) {
        errorMsg = errData.message;
      }
    } catch (e) {
      // Not JSON, stick with statusText
    }

    throw new Error(errorMsg || "API Error occurred");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, config?: RequestConfig) => request<T>("GET", path, config),
  post: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("POST", path, { ...config, body }),
  put: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("PUT", path, { ...config, body }),
  patch: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("PATCH", path, { ...config, body }),
  delete: <T>(path: string, config?: RequestConfig) => request<T>("DELETE", path, config),
};
