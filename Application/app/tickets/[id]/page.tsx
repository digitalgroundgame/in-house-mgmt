"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TicketView, { type TimelineShowType } from "@/app/components/tickets/TicketView";
import { type Ticket } from "@/app/components/tickets/ticket-utils";
import { Loader, Center, Text } from "@mantine/core";

interface TimelineEntry {
  type: "audit" | "comment";
  created_at: string;
  actor_display: string | null;
  actor_id: number | null;
  changes?: Record<string, [string, string]>;
  message?: string;
}

export default function TicketInfoPage() {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showType, setShowType] = useState<TimelineShowType>("comment");

  useEffect(() => {
    if (!id) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tickets/${id}`, {
          credentials: "include",
        });

        if (res.status === 404) {
          throw new Error("Ticket does not exist");
        }

        if (!res.ok) {
          throw new Error("Failed to load ticket");
        }

        const data = (await res.json()) as Ticket;
        setTicket(data);
      } catch (err) {
        console.error(err);
        setError(`${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchTimeline = async () => {
      try {
        setTimelineLoading(true);
        const res = await fetch(`/api/tickets/${id}/timeline/?show=${showType}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load timeline");
        }

        const data = await res.json();
        setTimeline(data.results ?? data);
      } catch (err) {
        console.error(err);
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimeline();
  }, [id, showType]);

  if (loading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100%">
        <Text c="red">{error}</Text>
      </Center>
    );
  }

  if (!ticket) return null;

  return (
    <TicketView
      ticket={ticket}
      timeline={timeline}
      timelineLoading={timelineLoading}
      showType={showType}
      onShowTypeChange={setShowType}
    />
  );
}
