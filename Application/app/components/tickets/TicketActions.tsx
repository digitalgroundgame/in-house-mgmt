"use client";

import React, { useState, useEffect } from "react";
import { Paper, Stack, Title, Tooltip } from "@mantine/core";
import { type Ticket } from "@/app/components/tickets/ticket-utils";
import { type Event, type EventParticipation } from "@/app/components/event-utils";
import { type Contact } from "@/app/components/ContactTable";
import { SearchSelect, SearchSelectOption } from "@/app/components/SearchSelect";
import { apiClient } from "@/app/lib/apiClient";
import { useUser } from "@/app/components/provider/UserContext";

interface CommitmentStatus {
  value: string;
  label: string;
}

interface TicketActionsProps {
  ticket: Ticket;
  event?: Event;
  contact?: Contact;
}

export default function TicketActions({ ticket, event, contact }: TicketActionsProps) {
  const [participation, setParticipation] = useState<SearchSelectOption<CommitmentStatus> | null>(
    null
  );
  const [loadingParticipation, setLoadingParticipation] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!event || !contact) return;

    async function fetchParticipation() {
      if (!event || !contact) return;
      setLoadingParticipation(true);
      try {
        const searchParams = new URLSearchParams({
          event: event.id.toString(),
          contact: contact.id.toString(),
        });

        const data = await apiClient.get<{ results?: EventParticipation[] }>(
          `/participants?${searchParams}`
        );
        const existing = data.results?.[0];

        // Map EventParticipation to CommitmentStatus shape
        if (existing) {
          setParticipation({
            id: existing.status,
            label: existing.status_display,
            raw: { value: existing.status, label: existing.status_display },
          });
        } else {
          setParticipation({
            id: "UNKNOWN",
            label: "Unknown",
            raw: { value: "UNKNOWN", label: "Unknown" },
          });
        }
      } catch (err) {
        console.error("Error loading participation:", err);
      } finally {
        setLoadingParticipation(false);
      }
    }

    fetchParticipation();
  }, [event, contact]);

  /* =============================
   * Upsert EventParticipation React.SetStateAction<
   * ============================= */
  async function upsertParticipation(participation: SearchSelectOption<CommitmentStatus> | null) {
    if (!event || !contact || !participation) return;
    try {
      await apiClient.post("/participants/", {
        event_id: event.id,
        contact_id: contact.id,
        status: participation.raw?.value,
      });
      setParticipation(participation);
    } catch (err) {
      console.error(err);
      alert("Error upserting participation status");
    }
  }

  /* =============================
   * Render
   * ============================= */
  return (
    <Paper p="md" withBorder>
      <Stack>
        <Title order={5}>Actions</Title>

        {event && contact && (
          <Tooltip label="Update Event Participation">
            <SearchSelect<CommitmentStatus>
              endpoint="/api/commitment-statuses/"
              label="Event Commitment"
              placeholder="Select commitment status"
              limit={10}
              value={participation}
              onChange={upsertParticipation}
              mapResult={(type) => ({
                id: type.value,
                label: type.label,
                raw: type,
              })}
              disabled={
                loadingParticipation ||
                (user && ticket.assigned_to !== user.id) ||
                ticket.ticket_status !== "IN_PROGRESS"
              }
            />
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}
