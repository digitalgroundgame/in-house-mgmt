"use client";
import { Event } from "@/app/components/event-utils";
import EventView from "@/app/events/[id]/EventView";
import { useBackend } from "@/app/lib/api";
import { use } from "react";

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: eventDetail, refresh } = useBackend<Event>(`/api/events/${id}/`);

  return (
    <>
      <EventView event={eventDetail} refresh={refresh} />
    </>
  );
}
