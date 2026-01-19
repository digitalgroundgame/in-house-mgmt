import { cookies } from 'next/headers';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
  
  return fetch(`${process.env.BACKEND_URL}/${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookieHeader,
    }
  })
}