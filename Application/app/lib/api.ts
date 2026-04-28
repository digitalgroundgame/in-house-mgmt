import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/app/lib/apiClient";
import getCookie from "@/app/utils/cookie";

export interface BackendPaginatedResults<T> {
  count: number;
  next: string;
  previous: string;
  results: T[];
}
/**
 * This custom hook should be used for any query/GET API requests. it manages the states and the useEffect for you
 * and should reduce boilerplate in your components. Can be parametrized to return the type you need
 *
 * @param path the api path (with or without /api prefix)
 * @returns an object containing the requested data, loading state, and error states and refresh key
 */
export function useBackend<T>(path: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>();
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const apiPath = path.replace(/^\/api/, "");
        const json = await apiClient.get<T>(apiPath);

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [path, refreshToken]);

  return { data, loading, error, refresh };
}

/**
 * This should be used for any PUTs/POSTs.
 * @param path the api path
 * @param options typical fetch options
 * @returns object containing mutation callback,
 */
export function useBackendMutation<TResponse, TBody = unknown>(
  path: string,
  options?: RequestInit
) {
  const [data, setData] = useState<TResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (body?: TBody) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(path, {
        ...options,
        body: body ? JSON.stringify(body) : options?.body,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
          ...options?.headers,
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const json = (await res.json()) as TResponse;
      setData(json);
      return json;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, data, loading, error };
}
