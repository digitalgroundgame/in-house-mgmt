"use client";

import { AnonymousAttendeeDetail, Event } from "@/app/components/event-utils";
import { apiClient } from "@/app/lib/apiClient";
import {
  ActionIcon,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function AnonymousAttendeesSection({
  event,
  onUpdate,
}: {
  event: Event;
  onUpdate: (updated: Event) => void;
}) {
  const canEdit = event.editable_fields?.includes("anonymous_attendee_count") ?? false;
  const hasContent =
    event.anonymous_attendee_count > 0 || event.anonymous_attendees_detail.length > 0;

  if (!hasContent && !canEdit) return null;

  return <AnonymousAttendeesSectionContent event={event} onUpdate={onUpdate} canEdit={canEdit} />;
}

function AnonymousAttendeesSectionContent({
  event,
  onUpdate,
  canEdit,
}: {
  event: Event;
  onUpdate: (updated: Event) => void;
  canEdit: boolean;
}) {
  const [countValue, setCountValue] = useState<number | string>(event.anonymous_attendee_count);
  const [savingCount, setSavingCount] = useState(false);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  useEffect(() => {
    setCountValue(event.anonymous_attendee_count);
  }, [event.anonymous_attendee_count]);

  const saveCount = async (val: number | string) => {
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    if (isNaN(num) || num < 0) return;
    setSavingCount(true);
    try {
      const updated = await apiClient.patch<Event>(`/events/${event.id}`, {
        anonymous_attendee_count: num,
      });
      onUpdate(updated);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save anonymous count.",
        color: "red",
      });
    } finally {
      setSavingCount(false);
    }
  };

  return (
    <>
      {detailOpened && (
        <AnonymousDetailModal
          event={event}
          opened={detailOpened}
          close={closeDetail}
          onUpdate={onUpdate}
        />
      )}
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group justify="space-between">
            <Title order={5}>Anonymous Attendees</Title>
            {(canEdit || event.anonymous_attendees_detail.length > 0) && (
              <Button size="xs" variant="subtle" onClick={openDetail}>
                {canEdit ? "Manage details" : "View details"}
              </Button>
            )}
          </Group>
          {canEdit ? (
            <NumberInput
              label="Count"
              description="Number of anonymous attendees (not tracked as contacts)"
              value={countValue}
              onChange={setCountValue}
              onBlur={() => saveCount(countValue)}
              min={0}
              style={{ maxWidth: 200 }}
              disabled={savingCount}
            />
          ) : (
            <Text>{event.anonymous_attendee_count} anonymous attendees</Text>
          )}
        </Stack>
      </Paper>
    </>
  );
}

function AnonymousDetailModal({
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
    setSaving(true);
    try {
      const cleanedEntries: AnonymousAttendeeDetail[] = entries.map((e) => ({
        ...(e.name ? { name: e.name } : {}),
        ...(e.contact_info ? { contact_info: e.contact_info } : {}),
        ...(e.notes ? { notes: e.notes } : {}),
      }));
      const updated = await apiClient.patch<Event>(`/events/${event.id}`, {
        anonymous_attendees_detail: cleanedEntries,
      });
      onUpdate(updated);
      close();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save anonymous attendee details.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = event.editable_fields?.includes("anonymous_attendees_detail") ?? false;

  return (
    <Modal opened={opened} onClose={close} title="Anonymous Attendee Details" size="xl">
      <LoadingOverlay visible={saving} />
      <Stack>
        {entries.length === 0 && (
          <Text c="dimmed" size="sm">
            No individual details recorded yet.
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
              Add entry
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
