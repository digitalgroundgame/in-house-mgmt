import ContactsClient from '@/app/contacts/ContactsClient';
import { apiFetch } from '../lib/api';


export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();


  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }

  if ('page' !in params) {
    params.set('page', '1')
  }


  const res = await apiFetch(
    `api/contacts/?${params.toString()}`,
    { cache: 'no-store' }
  );

  const tagRes = await apiFetch(
    `api/tags/`
  )


  const data = await res.json();
  const tags = await tagRes.json();


  return (
    <ContactsClient
      contacts={data.results}
      totalCount={data.count}
      nextPage={data.next ? true : false}
      previousPage={data.previous ? true : false}
      tags={tags.results}
    />
  );
}