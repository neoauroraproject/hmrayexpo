export function getApiUrl(): string {
  // Same-origin via Caddy in production — no domain baked into the image.
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://localhost:4000/api";
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    if (!token || token === "undefined" || token === "null") {
      localStorage.removeItem("admin_token");
      return;
    }
    localStorage.setItem("admin_token", token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  }
  return null;
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  const token = getAuthToken();

  const config: RequestInit = {
    ...customConfig,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  let url = `${getApiUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getAuthToken();

  const config: RequestInit = {
    method: "POST",
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  const response = await fetch(
    `${getApiUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
    config,
  );

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Upload Error: ${response.status}`);
  }

  return response.json();
}
