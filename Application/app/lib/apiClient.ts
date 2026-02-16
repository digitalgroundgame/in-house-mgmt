import getCookie from "@/app/utils/cookie";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken") || "",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: object) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: object) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
