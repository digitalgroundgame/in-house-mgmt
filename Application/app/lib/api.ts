import { useEffect, useState } from "react";
import { apiClient } from "@/app/lib/apiClient";

export interface BackendPaginatedResults<T> {
  count: number;
  next: string;
  previous: string;
  results: T[];
}
/**
 * This custom hook should be used for any API requests. it manages the states and the useEffect for you
 * and should reduce boilerplate in your components. Can be parametrized to return the type you need
 *
 * @param path the api path (with or without /api prefix)
 * @returns an object containing the requested data, loading state, and error states and refresh key
 */
export function useBackend<T>(path: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>();
  const [refreshToken, refresh] = useState();

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
