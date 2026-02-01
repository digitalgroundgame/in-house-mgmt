"use client";

import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  TextInput,
  Select,
  Stack,
  Modal,
  Textarea,
  Text,
  ActionIcon,
} from "@mantine/core";
import { IconPlus, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import EventsTable from "@/app/components/EventsTable";
import { type Event } from "../components/event-utils";
import { DateTimePicker, DateTime } from "@/app/components/datetime";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string | null>("all");
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch events whenever filters change
  useEffect(() => {
    fetchEvents();
  }, [searchQuery, dateFilter]);

  const fetchEvents = async (url?: string) => {
    try {
      setLoading(true);

      let fetchUrl = url;
      if (!fetchUrl) {
        // Build query parameters for initial fetch
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (dateFilter && dateFilter !== "all") params.append("date_filter", dateFilter);
        fetchUrl = `/api/events/?${params}`;
      }

      const response = await fetch(fetchUrl);
      const data = await response.json();
      console.log(data);

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

  const handleReset = () => {
    setSearchQuery("");
    setDateFilter("all");
    fetchEvents();
  };

  const handleRowClick = (event: Event) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleAddEvent = () => {
    form.reset();
    setAddModalOpen(true);
  };

  const handleSubmitEvent = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/events/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

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

  const handleNext = () => {
    if (nextUrl) {
      fetchEvents(nextUrl);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (previousUrl) {
      fetchEvents(previousUrl);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // TODO: Proper date filtering
  // const dateFilterOptions = [
  //   { value: 'all', label: 'All Events' },
  //   { value: 'upcoming', label: 'Upcoming' },
  //   { value: 'past', label: 'Past' }
  // ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {/* Header with title and action buttons */}
        <Group justify="space-between">
          <Title order={2}>Events</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddEvent}>
            Add event
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group gap="md" align="flex-end">
              <TextInput
                label="Search"
                placeholder="Search by name, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
              />
              {/*<Select
                label="Date"
                placeholder="Filter by date"
                value={dateFilter}
                onChange={setDateFilter}
                data={dateFilterOptions}
                style={{ minWidth: 200 }}
              />*/}
            </Group>
            <Group gap="sm">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Events Table */}
        <EventsTable
          events={events}
          loading={loading}
          onRowClick={handleRowClick}
          showTitle={false}
        />

        {/* Pagination and count */}
        <Paper p="sm" withBorder>
          <Group justify="space-between">
            <span>
              {totalCount} {totalCount === 1 ? "event" : "events"} found
            </span>
            <Group gap="xs">
              <ActionIcon
                variant="filled"
                disabled={!previousUrl}
                onClick={handlePrevious}
                aria-label="Previous page"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                disabled={!nextUrl}
                onClick={handleNext}
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
            <DateTimePicker
              label="Start Date"
              required
              value={form.values.starts_at}
              onChange={(val) => form.setFieldValue("starts_at", val || "")}
              error={form.errors.starts_at as string}
            />
            <DateTimePicker
              label="End Date"
              required
              value={form.values.ends_at}
              onChange={(val) => form.setFieldValue("ends_at", val || "")}
              error={form.errors.ends_at as string}
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
              <DateTime value={selectedEvent.starts_at} size="sm" style="long" />
              <DateTime value={selectedEvent.ends_at} size="sm" style="long" />
            </div>
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Location
              </Text>
              <Text size="sm">{selectedEvent.location_display}</Text>
            </div>
            {/*TODO: Implement participants with issue #24 */}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
