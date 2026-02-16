"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/app/lib/apiClient";
import TicketView, {
  TimelineEntry,
  type TimelineShowType,
} from "@/app/components/tickets/TicketView";
import { type Ticket } from "@/app/components/tickets/ticket-utils";
import { Loader, Center, Text } from "@mantine/core";

export default function TicketInfoPage() {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showType, setShowType] = useState<TimelineShowType>("comments");

  useEffect(() => {
    if (!id) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<Ticket>(`/tickets/${id}`);
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
        const data = await apiClient.get<{ results?: TimelineEntry[] } | TimelineEntry[]>(
          `/tickets/${id}/timeline/?show=${showType}`
        );
        const entries = Array.isArray(data) ? data : (data.results ?? []);
        setTimeline(entries);
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
