"use client";
import { Event } from "@/app/components/event-utils";
import EventView from "@/app/events/[id]/EventView";
import { useBackend } from "@/app/lib/api";
import { useEffect, useState, use } from "react";

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // const [eventDetail, setEventDetail] = useState<Event>();
  const { id } = use(params);
  const { data: eventDetail, loading, error } = useBackend<Event>(`/api/events/${id}`);

  return (
    <>
      <EventView event={eventDetail} />
    </>
  );
}
