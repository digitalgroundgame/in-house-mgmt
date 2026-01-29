'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Title,
  Tooltip,
  Group,
  Text,
  Loader,
} from '@mantine/core';
import { type Ticket, type TicketAsk, type TicketAskStatus } from '@/app/components/ticket-utils';
import { type Event } from '@/app/components/EventTable';
import { type Contact } from '@/app/components/ContactTable';
import { SearchSelect, SearchSelectOption } from '@/app/components/SearchSelect';
import getCookie from '@/app/utils/cookie';
import { useUser } from '@/app/components/provider/UserContext';

// TODO: Move to another file
export interface EventParticipation {
  id: number;
  status: string;
  status_display: string;
}

interface CommitmentStatus {
  value: string;
  label: string;
}


interface TicketActionsProps {
  ticket: Ticket;
  event?: Event;
  contact?: Contact;
}

export default function TicketActions({
  ticket,
  event,
  contact,
}: TicketActionsProps) {
  const [participation, setParticipation] =
    useState<SearchSelectOption | null>(null);
  const [loadingParticipation, setLoadingParticipation] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!event || !contact) return;

    async function fetchParticipation() {
      setLoadingParticipation(true);
      try {
        const searchParams = new URLSearchParams({
          event: event.id.toString(),
          contact: contact.id.toString(),
        });

        const res = await fetch(`/api/participants?${searchParams}`);
        if (!res.ok) throw new Error('Failed to fetch participation');

        const data = await res.json();
        const existing = data.results?.[0];

        if (existing) {
          setParticipation({
            id: existing.status,
            label: existing.status_display,
            raw: existing,
          });
        } else {
          setParticipation({
            id: 'UNKNOWN',
            label: 'Unknown',
            raw: { value: 'UNKNOWN', label: 'Unknown' },
          });
        }
      } catch (err) {
        console.error('Error loading participation:', err);
      } finally {
        setLoadingParticipation(false);
      }
    }

    fetchParticipation();
  }, [event, contact]);

  /* =============================
   * Upsert EventParticipation
   * ============================= */
  async function upsertParticipation(participation) {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event.id,
          contact: contact.id,
          status: participation.raw.value,
        }),
      });
      setParticipation(participation)

      if (!res.ok) throw new Error('Failed to upsert participation');
    } catch (err) {
      console.error(err);
      alert('Error upserting participation status');
    }
  }


  /* =============================
   * Render
   * ============================= */
  return (
    <Paper p="md" withBorder>
      <Stack spacing="md">
        <Title order={5}>Actions</Title>

        {/* -------------------------
         * Event Participation
         * ------------------------- */}
        {event && contact && (
          <Tooltip label="Update Event Participation">
            <SearchSelect<CommitmentStatus>
              endpoint="/api/commitment-statuses"
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
                loadingParticipation || (user && ticket.assigned_to !== user.id) || (ticket.ticket_status !== "IN_PROGRESS")
              }
            />
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}
