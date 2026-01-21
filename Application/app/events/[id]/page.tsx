"use server"
import { Event } from '@/app/components/event-utils';
import { Text, Paper, Container, Stack, Divider, Title, Grid } from "@mantine/core";
import EventView from '@/app/events/[id]/EventView'
import { apiFetch } from '@/app/lib/api';

export default async function EventDetailsPage({params}: {params: Promise<{id: string}>}) {
  const { id } = await params
  const eventDetails = await (await apiFetch(`api/events/${id}`)).json() as Event
  console.log(eventDetails)
  return <EventView event={eventDetails}/>
}