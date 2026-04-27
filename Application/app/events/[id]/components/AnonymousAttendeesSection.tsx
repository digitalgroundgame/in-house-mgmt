"use client";

import { AnonymousAttendeeDetail, Event } from "@/app/components/event-utils";
import { apiClient } from "@/app/lib/apiClient";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

export function AnonymousAttendeesModal({
  event,
  opened,
  close,
  onUpdate,
}: {
  event: Event;
  opened: boolean;
  close: () => void;
  onUpdate: (updated: Event) => void;
}) {
  const canEdit = event.editable_fields?.includes("anonymous_attendee_count") ?? false;
  const [count, setCount] = useState<number | string>(event.anonymous_attendee_count);
  const [entries, setEntries] = useState<AnonymousAttendeeDetail[]>([
    ...event.anonymous_attendees_detail,
  ]);
  const [saving, setSaving] = useState(false);

  const addEntry = () => setEntries((prev) => [...prev, {}]);

  const updateEntry = (index: number, field: keyof AnonymousAttendeeDetail, value: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const num = typeof count === "string" ? parseInt(count, 10) : count;
    if (isNaN(num) || num < 0) {
      notifications.show({
        title: "Invalid count",
        message: "Count must be 0 or greater.",
        color: "red",
      });
      return;
    }
    setSaving(true);
    try {
      const cleanedEntries: AnonymousAttendeeDetail[] = entries.map((e) => ({
        ...(e.name ? { name: e.name } : {}),
        ...(e.contact_info ? { contact_info: e.contact_info } : {}),
        ...(e.notes ? { notes: e.notes } : {}),
      }));
      const updated = await apiClient.patch<Event>(`/events/${event.id}`, {
        anonymous_attendee_count: num,
        anonymous_attendees_detail: cleanedEntries,
      });
      onUpdate(updated);
      close();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save anonymous participant information.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Anonymous Participants" size="xl">
      <LoadingOverlay visible={saving} />
      <Stack>
        {canEdit ? (
          <NumberInput
            label="Count"
            description="Number of anonymous participants not tracked as contacts"
            value={count}
            onChange={setCount}
            min={0}
            style={{ maxWidth: 200 }}
          />
        ) : (
          <Text>
            <Text span fw={500}>
              {event.anonymous_attendee_count}
            </Text>{" "}
            anonymous participants
          </Text>
        )}

        <Divider label="Individual details (optional)" labelPosition="left" />

        {entries.length === 0 && (
          <Text c="dimmed" size="sm">
            No individual details recorded.
          </Text>
        )}

        {entries.map((entry, i) => (
          <Group key={i} align="flex-end">
            <TextInput
              label="Name"
              value={entry.name ?? ""}
              onChange={(e) => updateEntry(i, "name", e.currentTarget.value)}
              disabled={!canEdit}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Email or phone"
              value={entry.contact_info ?? ""}
              onChange={(e) => updateEntry(i, "contact_info", e.currentTarget.value)}
              disabled={!canEdit}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Notes"
              value={entry.notes ?? ""}
              onChange={(e) => updateEntry(i, "notes", e.currentTarget.value)}
              disabled={!canEdit}
              style={{ flex: 1 }}
            />
            {canEdit && (
              <ActionIcon color="red" onClick={() => removeEntry(i)} variant="subtle" mb={1}>
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>
        ))}

        {canEdit && (
          <Group justify="space-between">
            <Button variant="outline" onClick={addEntry}>
              + participant note
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
