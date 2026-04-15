"use client";

import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  TextInput,
  Stack,
  Modal,
  Textarea,
  Text,
  ActionIcon,
} from "@mantine/core";
import { IconPlus, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";
import EventsTable from "@/app/components/EventsTable";
import { type Event, type EventType } from "@/app/components/event-utils";
import { DateTime } from "@/app/components/datetime";
import { DateRangePicker } from "@/app/components/datetime";

interface EventTemplateViewProps {
  eventType: EventType;
  title?: string;
}

export default function EventTemplateView({ eventType, title = "Events" }: EventTemplateViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [start, setStartDate] = useState<string | null>(null);
  const [end, setEndDate] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      starts_at: "",
      ends_at: "",
      location_address: "",
      location_name: "",
    },
    validate: {
      name: (value) => (!value ? "Event name is required" : null),
      starts_at: (value) => (!value ? "Start date is required" : null),
      ends_at: (value) => (!value ? "End date is required" : null),
    },
  });

  useEffect(() => {
    fetchEvents();
  }, [searchQuery]);

  const fetchEvents = async (url?: string) => {
    try {
      setLoading(true);

      let fetchPath = url?.replace(/^\/api/, "");
      if (!fetchPath) {
        const params = new URLSearchParams();
        params.append("event_type", eventType);
        if (searchQuery) params.append("search", searchQuery);
        fetchPath = `/events/?${params}`;
      }

      const data = await apiClient.get<{
        results: Event[];
        count: number;
        next: string | null;
        previous: string | null;
      }>(fetchPath);

      setEvents(data.results || []);
      setTotalCount(data.count || 0);
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvent = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      await apiClient.post("/events/", { ...values, event_type: eventType });
      setAddModalOpen(false);
      form.reset();
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{title}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              form.reset();
              setAddModalOpen(true);
            }}
          >
            Add event
          </Button>
        </Group>

        <Paper p="md" withBorder>
          <Group gap="md" align="flex-end">
            <TextInput
              label="Search"
              placeholder="Search by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Button variant="outline" onClick={() => setSearchQuery("")} style={{ marginTop: 24 }}>
              Reset
            </Button>
          </Group>
        </Paper>

        <EventsTable
          events={events}
          loading={loading}
          onRowClick={(e) => {
            setSelectedEvent(e);
            setDetailsModalOpen(true);
          }}
          showTitle={false}
        />

        <Paper p="sm" withBorder>
          <Group justify="space-between">
            <span>
              {totalCount} {totalCount === 1 ? "event" : "events"} found
            </span>
            <Group gap="xs">
              <ActionIcon
                variant="filled"
                disabled={!previousUrl}
                onClick={() => previousUrl && fetchEvents(previousUrl)}
                aria-label="Previous page"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                disabled={!nextUrl}
                onClick={() => nextUrl && fetchEvents(nextUrl)}
                aria-label="Next page"
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      </Stack>

      {/* Add Event Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Event"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmitEvent)}>
          <Stack gap="md">
            <TextInput
              label="Event Name"
              placeholder="Enter event name"
              required
              {...form.getInputProps("name")}
            />
            <Textarea
              label="Description"
              placeholder="Enter event description (optional)"
              {...form.getInputProps("description")}
            />

            <DateRangePicker
              label="Event Dates"
              required
              value={{ start: form.values.starts_at || null, end: form.values.ends_at || null }}
              onChange={({ start, end }) => {
                form.setFieldValue("starts_at", start ?? "");
                form.setFieldValue("ends_at", end ?? "");
              }}
              error={(form.errors.starts_at as string) ?? (form.errors.ends_at as string)}
            />

            <TextInput
              label="Location Name"
              placeholder="Enter location (optional)"
              {...form.getInputProps("location_name")}
            />
            <TextInput
              label="Location Address"
              placeholder="Enter location (optional)"
              {...form.getInputProps("location_address")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Add Event
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedEvent?.name || "Event Details"}
        size="lg"
      >
        {selectedEvent && (
          <Stack gap="md">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Description
              </Text>
              <Text size="sm">{selectedEvent.description || "No description"}</Text>
            </div>
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Date
              </Text>
              <DateTime value={selectedEvent.starts_at} size="sm" format="long" />
              <DateTime value={selectedEvent.ends_at} size="sm" format="long" />
            </div>
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Location
              </Text>
              <Text size="sm">{selectedEvent.location_display}</Text>
            </div>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
