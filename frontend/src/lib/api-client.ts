// Typed API client — single file. Auth via httpOnly cookies (credentials: include).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8008/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(method: HttpMethod, path: string, config?: RequestConfig): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (config?.params) {
    Object.entries(config.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config?.headers,
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    credentials: "include",
    body: config?.body ? JSON.stringify(config.body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Try a single refresh; if it succeeds, retry the original request.
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(method, path, config);
      }
      redirectToLogin();
    }

    let errorMsg = res.statusText;
    try {
      const errData = await res.json();
      if (errData.detail) {
        if (typeof errData.detail === "string") {
          errorMsg = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          errorMsg = errData.detail.map((e: { loc?: string[]; msg?: string }) => `${e.loc?.join(".")}: ${e.msg}`).join(", ");
        } else if (typeof errData.detail === "object") {
          errorMsg = JSON.stringify(errData.detail);
        }
      } else if (errData.message) {
        errorMsg = errData.message;
      }
    } catch {
      // Not JSON, stick with statusText
    }

    throw new Error(errorMsg || "API Error occurred");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth") || window.location.pathname.startsWith("/admin/login")) return;
  window.location.href = window.location.pathname.startsWith("/admin") ? "/admin/login" : "/auth/login";
}

async function uploadFile<T>(path: string, formData: FormData, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), { method: "POST", headers: {}, credentials: "include", body: formData });
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errData = await res.json();
      if (errData.detail) errorMsg = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
    } catch {}
    throw new Error(errorMsg || "Upload failed");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string, config?: RequestConfig) => request<T>("GET", path, config),
  post: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("POST", path, { ...config, body }),
  put: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("PUT", path, { ...config, body }),
  patch: <T>(path: string, body?: unknown, config?: RequestConfig) => request<T>("PATCH", path, { ...config, body }),
  delete: <T>(path: string, config?: RequestConfig) => request<T>("DELETE", path, config),
  upload: <T>(path: string, formData: FormData, params?: Record<string, string | undefined>) => uploadFile<T>(path, formData, params),
};
