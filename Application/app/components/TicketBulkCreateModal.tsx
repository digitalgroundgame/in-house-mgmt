import {
  Modal,
  Select,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import getCookie from '@/app/utils/cookie';
import { type TicketType } from '@/app/components/ticket-utils';
import { SearchSelect, SearchSelectOption } from './SearchSelect';

interface Event { id: number; name: string }
interface User { id: number; name: string }

interface Props {
  opened: boolean;
  onClose: () => void;
  contactIds: number[];
  users: User[];
  onSuccess?: () => void;
}

export function TicketBulkCreateModal({
  opened,
  onClose,
  contactIds,
  onSuccess,
}: Props) {
  const [ticketType, setTicketType] = useState<SearchSelectOption | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [event, setEvent] = useState<SearchSelectOption | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, _setAssignedToId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      contact_ids: contactIds.map(Number),
      ticket_type: ticketType?.id ?? "UNKNOWN",
      ticket_status: "OPEN",
      title,
      description,
    };

    if (event) payload.event_id = Number(event.id);
    if (assignedToId) payload.assigned_to_id = Number(assignedToId);
    if (priority !== null) payload.priority = Number(priority);

    try {
      const res = await fetch("/api/tickets/bulk/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie('csrftoken')!,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data));
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Bulk Create Tickets" size="lg" centered>
      <Stack gap="md">
        {/* Ticket Type */}
        <SearchSelect<TicketType>
          endpoint="/api/ticket-types"
          label="Ticket Type"
          placeholder="Select ticket type"
          limit={10}
          value={ticketType}
          onChange={setTicketType}
          clearable
          mapResult={(type) => ({
            id: type.value,
            label: type.label,
            raw: type,
          })}
        />

        {/* Priority */}
        <Select
          label="Priority"
          placeholder="Default (P3)"
          data={[
            { value: "0", label: "P0 – Emergency" },
            { value: "1", label: "P1 – Very High" },
            { value: "2", label: "P2 – High" },
            { value: "3", label: "P3 – Normal" },
            { value: "4", label: "P4 – Low" },
            { value: "5", label: "P5 – Very Low" },
          ]}
          value={priority}
          onChange={setPriority}
          clearable
        />

        {/* Event */}
        <SearchSelect<Event>
          endpoint="/api/events/"
          label="Event"
          placeholder="Search events"
          limit={5}
          value={event}
          onChange={setEvent}
          clearable
          mapResult={(event) => ({
            id: event.id,
            label: `${event.name} (id: ${event.id})`,
            raw: event,
          })}
        />

        {/* Title / Description */}
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Description" minRows={3} value={description} onChange={(e) => setDescription(e.currentTarget.value)} />

        {error && <Text c="red" size="sm">{error}</Text>}

        {/* Footer */}
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            {contactIds.length === 0
              ? "No tickets will be created"
              : `${contactIds.length} ticket${contactIds.length !== 1 ? "s" : ""} will be created`}
          </Text>

          <Group>
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submit} loading={loading} disabled={contactIds.length === 0}>
              Create Tickets
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
