import getCookie from "@/app/utils/cookie";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

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
    let detail = errorBody?.detail;
    if (Array.isArray(detail)) {
      detail = detail[0];
    } else if (typeof detail === "object" && detail !== null) {
      detail = JSON.stringify(detail);
    }
    detail = detail || `API error: ${res.status}`;
    throw new ApiError(detail, res.status, errorBody);
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
