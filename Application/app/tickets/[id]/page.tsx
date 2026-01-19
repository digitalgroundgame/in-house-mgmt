'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TicketView from "@/app/components/TicketView";
import { type Ticket } from "@/app/components/ticket-utils";
import { Loader, Center, Text } from "@mantine/core";

export default function TicketInfoPage() {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return <TicketView ticket={ticket} />;
}
