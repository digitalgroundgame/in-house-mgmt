"use client";

import { Table, Stack, Title, LoadingOverlay, Paper, Text, Checkbox } from "@mantine/core";
import { useRouter } from "next/navigation";
import { Event } from "./event-utils";
import { DateRange } from "@/app/components/datetime";

interface EventsTableProps {
  events: Event[];
  loading?: boolean;
  showTitle?: boolean;
  isSelectable?: boolean;
  selectedIds?: Set<number>;
  toggleSelect?: (id: number) => void;
}

export default function EventsTable({
  events,
  loading = false,
  showTitle = true,
  isSelectable = false,
  selectedIds,
  toggleSelect,
}: EventsTableProps) {
  const router = useRouter();

  const allOnPageSelected =
    isSelectable && events.length > 0 && events.every((e) => selectedIds?.has(e.id));

  const someOnPageSelected = isSelectable && events.some((e) => selectedIds?.has(e.id));

  const toggleSelectAllOnPage = () => {
    if (!toggleSelect || !selectedIds) return;

    if (allOnPageSelected) {
      events.forEach((e) => {
        if (selectedIds.has(e.id)) {
          toggleSelect(e.id);
        }
      });
    } else {
      events.forEach((e) => {
        if (!selectedIds.has(e.id)) {
          toggleSelect(e.id);
        }
      });
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
              {isSelectable && (
                <Table.Th w={40}>
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected && !allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                  />
                </Table.Th>
              )}
              <Table.Th>Event Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Location</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={isSelectable ? 5 : 4} style={{ textAlign: "center" }}>
                  <Text c="dimmed" py="xl">
                    No events found.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              events.map((event) => {
                const selected = selectedIds?.has(event.id);

                return (
                  <Table.Tr
                    key={event.id}
                    bg={selected ? "var(--mantine-color-blue-light)" : undefined}
                    onClick={() => {
                      if (isSelectable && toggleSelect && selectedIds?.size) {
                        toggleSelect(event.id);
                      } else {
                        router.push(`/events/${event.id}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {isSelectable && (
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected} onChange={() => toggleSelect!(event.id)} />
                      </Table.Td>
                    )}
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
                      <DateRange
                        start={event.starts_at}
                        end={event.ends_at}
                        size="sm"
                        format="medium"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{event.location_display}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}
