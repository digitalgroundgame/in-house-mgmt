"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/app/lib/apiClient";
import { Loader, Center, Text, ActionIcon } from "@mantine/core";
import TicketView, {
  TimelineEntry,
  type TimelineShowType,
} from "@/app/components/tickets/TicketView";
import { type Ticket } from "@/app/components/tickets/ticket-utils";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
//import TicketView, { type TimelineShowType } from "@/app/components/tickets/TicketView";

export default function TicketInfoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navLoading, setNavLoading] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showType, setShowType] = useState<TimelineShowType>("comment");

  const navigate = async (direction: "next" | "previous") => {
    setNavLoading(true);
    try {
      const params = searchParams.toString();
      const query = params ? `?${params}` : "";
      const res = await fetch(`/api/tickets/${direction}/${id}${query}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as Ticket;
      const targetParams = params ? `?${params}` : "";
      router.push(`/tickets/${data.id}${targetParams}`);
    } catch (err) {
      console.error(err);
    } finally {
      setNavLoading(false);
    }
  };

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
    <div style={{ display: "flex", alignItems: "stretch", minHeight: "100%" }}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => navigate("previous")}
        disabled={navLoading}
        style={{ alignSelf: "stretch", height: "auto", width: 40, borderRadius: 0 }}
        aria-label="Previous ticket"
      >
        <IconChevronLeft size={24} />
      </ActionIcon>

      <div style={{ flex: 1, minWidth: 0 }}>
        <TicketView
          ticket={ticket}
          timeline={timeline}
          timelineLoading={timelineLoading}
          showType={showType}
          onShowTypeChange={setShowType}
          setTimeline={setTimeline}
        />
      </div>

      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => navigate("next")}
        disabled={navLoading}
        style={{ alignSelf: "stretch", height: "auto", width: 40, borderRadius: 0 }}
        aria-label="Next ticket"
      >
        <IconChevronRight size={24} />
      </ActionIcon>
    </div>
  );
}
