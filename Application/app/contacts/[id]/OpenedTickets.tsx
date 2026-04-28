"use client";

import {
  Title,
  Text,
  Stack,
  Paper,
  LoadingOverlay,
  Box,
  Group,
  Grid,
  Badge,
  Divider,
  TextInput,
  ActionIcon,
  ScrollArea,
  Tooltip,
} from "@mantine/core";
import { useState, useEffect, useCallback } from "react";
import { IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { DateTime } from "@/app/components/datetime";
import { apiClient } from "@/app/lib/apiClient";

interface TicketListItem {
  id: number;
  title: string;
  ticket_status: string;
  status_display: string;
  type_display: string;
  priority_display: string;
  created_at: string;
}

interface FilterState {
  value: string;
  mode: "include" | "exclude";
}

interface StatusOption {
  value: string;
  label: string;
}

function FilterBadgeGroup({
  label,
  options,
  filter,
  onToggle,
}: {
  label: string;
  options: StatusOption[];
  filter: FilterState | null;
  onToggle: (value: string) => void;
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Group gap={4}>
        {options.map((s) => {
          const active = filter?.value === s.value;
          const excluding = active && filter?.mode === "exclude";
          return (
            <Tooltip
              key={s.value}
              label={
                active
                  ? excluding
                    ? "Excluding this — click to clear"
                    : "Filtering by this — click to exclude"
                  : "Click to filter"
              }
            >
              <Badge
                size="sm"
                variant={active ? (excluding ? "outline" : "filled") : "light"}
                color={excluding ? "red" : "gray"}
                style={{ cursor: "pointer" }}
                onClick={() => onToggle(s.value)}
              >
                {excluding && "✕ "}
                {s.label}
              </Badge>
            </Tooltip>
          );
        })}
      </Group>
    </Stack>
  );
}

export default function OpenedTickets({ contactId }: { contactId: string }) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsNext, setTicketsNext] = useState<string | null>(null);
  const [ticketsPrevious, setTicketsPrevious] = useState<string | null>(null);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<FilterState | null>(null);
  const [ticketStatuses, setTicketStatuses] = useState<StatusOption[]>([]);

  useEffect(() => {
    fetchTicketStatuses();
  }, [contactId]);

  const fetchTicketStatuses = async () => {
    try {
      const data = await apiClient.get<StatusOption[]>("/ticket-statuses/");
      setTicketStatuses(data.filter((s) => s.value !== "CANCELED"));
    } catch (error) {
      console.error("Error fetching ticket statuses:", error);
    }
  };

  const buildTicketsUrl = useCallback(
    (page?: number) => {
      const params = new URLSearchParams();
      params.set("contact", contactId);
      params.set("page_size", "6");
      if (ticketSearch) params.set("search", ticketSearch);
      if (ticketStatusFilter) {
        if (ticketStatusFilter.mode === "include") params.set("status", ticketStatusFilter.value);
      }
      if (page && page > 1) params.set("page", String(page));
      const qs = params.toString();
      return `/tickets/${qs ? `?${qs}` : ""}`;
    },
    [contactId, ticketSearch, ticketStatusFilter]
  );

  const fetchTickets = useCallback(
    async (url?: string) => {
      try {
        setTicketsLoading(true);
        const fetchPath = url?.replace(/^\/api/, "") || buildTicketsUrl();
        const data = await apiClient.get<{
          results: TicketListItem[];
          next: string | null;
          previous: string | null;
          count: number;
        }>(fetchPath);
        const results: TicketListItem[] = data.results || [];
        setTickets(results.filter((t) => t.ticket_status !== "CANCELED"));
        setTicketsNext(data.next);
        setTicketsPrevious(data.previous);
        setTicketsCount(data.count || 0);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setTicketsLoading(false);
      }
    },
    [buildTicketsUrl]
  );

  useEffect(() => {
    setTicketsPage(1);
    fetchTickets(buildTicketsUrl(1));
  }, [ticketSearch, ticketStatusFilter]);

  const toggleFilter = (
    current: FilterState | null,
    setter: (f: FilterState | null) => void,
    value: string
  ) => {
    if (!current || current.value !== value) {
      setter({ value, mode: "include" });
    } else if (current.mode === "include") {
      setter({ value, mode: "exclude" });
    } else {
      setter(null);
    }
  };

  const totalTicketPages = Math.ceil(ticketsCount / 6) !== 0 ? Math.ceil(ticketsCount / 6) : 1;
  console.log(ticketsCount);

  return (
    <Grid.Col span={{ base: 12, md: 6 }}>
      <Paper withBorder p="lg" radius="md" h="100%">
        <Box
          pos="relative"
          style={{ minHeight: 350, display: "flex", flexDirection: "column", height: "100%" }}
        >
          <LoadingOverlay visible={ticketsLoading} />
          <Stack gap="sm" style={{ flex: 1 }}>
            <Title order={4}>Opened Tickets</Title>

            <TextInput
              placeholder="Search tickets..."
              leftSection={<IconSearch size={16} />}
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.currentTarget.value)}
              size="xs"
            />

            <FilterBadgeGroup
              label="Status"
              options={ticketStatuses}
              filter={ticketStatusFilter}
              onToggle={(v) => toggleFilter(ticketStatusFilter, setTicketStatusFilter, v)}
            />

            <Divider />

            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="xs">
                {tickets.length === 0 && !ticketsLoading ? (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    No tickets found.
                  </Text>
                ) : (
                  tickets.map((t) => (
                    <Paper key={t.id} withBorder p="xs" radius="sm">
                      <Group justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate="end">
                            {t.title || "Untitled Ticket"}
                          </Text>
                          <DateTime value={t.created_at} size="xs" c="dimmed" includeTime={false} />
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <Badge size="xs" variant="light">
                            {t.status_display}
                          </Badge>
                          <Badge size="xs" variant="dot">
                            {t.type_display}
                          </Badge>
                        </Group>
                      </Group>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Stack>

          <Group justify="center" gap="xs" mt="sm">
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={!ticketsPrevious}
              onClick={() => {
                if (ticketsPrevious) {
                  setTicketsPage((p) => p - 1);
                  fetchTickets(ticketsPrevious);
                }
              }}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {ticketsPage} / {totalTicketPages}
            </Text>
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={!ticketsNext}
              onClick={() => {
                if (ticketsNext) {
                  setTicketsPage((p) => p + 1);
                  fetchTickets(ticketsNext);
                }
              }}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        </Box>
      </Paper>
    </Grid.Col>
  );
}
