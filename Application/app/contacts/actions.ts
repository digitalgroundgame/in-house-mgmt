"use server";

import { apiFetch } from "../lib/api";

export interface CreateUserRequest {
  discord_id: string
  full_name: string
  email: string
  phone: string
  tags: string[]
}

export async function createUser(data: CreateUserRequest) {
  const response = await apiFetch(`api/contacts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to create contact');
  }

  const contact = await response.json();

  const tagAssignmmentReqs = data.tags.map(tagName => apiFetch('/api/tag-assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contact_id: contact.id,
      tag_name: tagName
    }),
  }))

  await Promise.all(tagAssignmmentReqs)
}