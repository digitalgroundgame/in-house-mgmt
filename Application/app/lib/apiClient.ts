import getCookie from "@/app/utils/cookie";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFullUrl = path.startsWith("http://") || path.startsWith("https://");
  const url = isFullUrl ? path : `/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken") || "",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    console.error("API error body:", errorBody);
    const detail = errorBody?.detail || `API error: ${res.status}`;
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, data: object, options?: RequestInit) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: object, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(data) }),
  delete: (path: string, options?: RequestInit) =>
    request<void>(path, { ...options, method: "DELETE" }),
};
