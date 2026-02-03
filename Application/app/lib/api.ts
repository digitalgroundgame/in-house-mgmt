import { useEffect, useState } from 'react';

export interface BackendPaginatedResults<T> {
  count: number,
  next: string,
  previous: string,
  results: T[]
}
/**
 * This custom hook should be used for any API requests. it manages the states and the useEffect for you
 * and should reduce boilerplate in your components. Can be parametrized to return the type you need
 * 
 * @param path the api path 
 * @param options typical fetch options
 * @returns an object containing the requested data, loading state, and error states
 */
export function useBackend<T>(path: string, options: RequestInit = {}) {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>()

  useEffect(() => {
    setLoading(true)
    fetch(path, {
      ...options,
    }).then(out => out.json() as Promise<T>)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [path])

  return { data, loading, error }
} 
