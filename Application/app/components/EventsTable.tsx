"use client";

import { Table, Badge, Stack, Title, LoadingOverlay, Paper, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { Event } from "./event-utils";

interface EventsTableProps {
  events: Event[];
  loading?: boolean;
  onRowClick?: (event: Event) => void;
  showTitle?: boolean;
}

export default function EventsTable({
  events,
  loading = false,
  onRowClick,
  showTitle = true,
}: EventsTableProps) {
  const router = useRouter();
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Paper p="md" withBorder style={{ position: "relative", minHeight: "400px" }}>
      <LoadingOverlay visible={loading} />
      <Stack gap="md">
        {showTitle && <Title order={4}>Events ({events.length})</Title>}
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Event Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Location</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.length === 0 ? (
              <Table.Tr>
                <Table.Td key={0} colSpan={5} style={{ textAlign: "center" }}>
                  <Text c="dimmed" py="xl">
                    No events found.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              events.map((event) => (
                <Table.Tr
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {event.name}
                    </Text>
                    {event.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {event.description}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{event.status_display}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {formatDate(event.starts_at)} - {formatDate(event.ends_at)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{event.location_display}</Text>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}
