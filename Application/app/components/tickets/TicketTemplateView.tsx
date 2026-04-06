"use client";

import {
  Container,
  Title,
  Grid,
  Paper,
  Group,
  Badge,
  Select,
  Stack,
  Text,
  Button,
  ActionIcon,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiClient";
import TicketTable, {
  type SortField,
  type SortDirection,
} from "@/app/components/tickets/TicketTable";
import { useUser } from "@/app/components/provider/UserContext";
import { SearchSelect, type SearchSelectOption } from "@/app/components/SearchSelect";
import { type Ticket } from "@/app/components/tickets/ticket-utils";

interface UserResult {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface EventResult {
  id: number;
  name: string;
}

const openStatusValues = ["OPEN", "TODO", "IN_PROGRESS", "BLOCKED"];
const closedStatusValues = ["COMPLETED", "CANCELED"];
const defaultExcluded = ["COMPLETED", "CANCELED"];

const statusBadges = [
  { value: "OPEN", label: "Open" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
];

interface TicketTemplateViewProps {
  title?: string;
  ticketTypes: { value: string; label: string }[];
}

export default function TicketTemplateView({
  title = "Ticket Queue Management",
  ticketTypes,
}: TicketTemplateViewProps) {
  const { user } = useUser();

  // When there's only one type it's always applied as a fixed filter
  const fixedType = ticketTypes.length === 1 ? ticketTypes[0].value : null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(defaultExcluded);
  const [priorities, setPriorities] = useState<{ value: string; label: string }[]>([]);
  const [priority, setPriority] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<SearchSelectOption<UserResult> | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [event, setEvent] = useState<SearchSelectOption<EventResult> | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    fetchTickets();
    fetchPriorities();
  }, []);

  const fetchPriorities = async () => {
    try {
      const data = await apiClient.get<{ value: number; label: string }[]>("/ticket-priorities");
      setPriorities(data.map((p) => ({ value: String(p.value), label: p.label })));
    } catch (error) {
      console.error("Error fetching priorities:", error);
    }
  };

  const fetchTickets = async (
    url?: string,
    overrides?: {
      priority?: string | null;
      ticketType?: string | null;
      assignee?: SearchSelectOption<UserResult> | null;
      event?: SearchSelectOption<EventResult> | null;
      sortField?: SortField;
      sortDirection?: SortDirection;
      excludedStatuses?: string[];
    }
  ) => {
    try {
      setLoading(true);
      let fetchPath = url || "/tickets";

      if (!url) {
        const params = new URLSearchParams();

        const effectivePriority = overrides?.priority !== undefined ? overrides.priority : priority;
        const effectiveType =
          overrides?.ticketType !== undefined ? overrides.ticketType : ticketType;
        const effectiveSortField =
          overrides?.sortField !== undefined ? overrides.sortField : sortField;
        const effectiveSortDirection =
          overrides?.sortDirection !== undefined ? overrides.sortDirection : sortDirection;
        const effectiveAssignee = overrides?.assignee !== undefined ? overrides.assignee : assignee;
        const effectiveEvent = overrides?.event !== undefined ? overrides.event : event;
        const effectiveExcluded =
          overrides?.excludedStatuses !== undefined ? overrides.excludedStatuses : excludedStatuses;

        // Fixed type takes priority; user-selected type only applies when there are multiple options
        if (fixedType) {
          params.append("type", fixedType);
        } else if (effectiveType) {
          params.append("type", effectiveType);
        }
        if (effectiveAssignee) params.append("assigned_to", String(effectiveAssignee.id));
        if (effectiveEvent) params.append("event", String(effectiveEvent.id));
        if (effectivePriority != null) params.append("priority", effectivePriority);
        if (effectiveSortField && effectiveSortDirection) {
          params.append(
            "ordering",
            effectiveSortDirection === "desc" ? `-${effectiveSortField}` : effectiveSortField
          );
        }
        if (effectiveExcluded.length > 0)
          params.append("exclude_status", effectiveExcluded.join(","));

        if (params.toString()) fetchPath = `/tickets?${params.toString()}`;
      }

      const data = await apiClient.get<{
        results: Ticket[];
        count: number;
        next: string | null;
        previous: string | null;
      }>(fetchPath);
      setTickets(data.results || []);
      setTotalCount(data.count);
      setNextUrl(data.next);
      setPreviousUrl(data.previous);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const setNewAssignee = (newAssignee: SearchSelectOption<UserResult> | null) => {
    setAssignedToMe(false);
    setAssignee(newAssignee);
    fetchTickets(undefined, { assignee: newAssignee });
  };

  const toggleAssignedToMe = () => {
    if (assignedToMe) {
      setAssignedToMe(false);
      setAssignee(null);
      fetchTickets(undefined, { assignee: null });
    } else if (user) {
      const meOption: SearchSelectOption<UserResult> = {
        id: user.id,
        label: user.first_name
          ? `${user.first_name} ${user.last_name} (${user.username})`
          : user.username,
        raw: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      };
      setAssignedToMe(true);
      setAssignee(meOption);
      fetchTickets(undefined, { assignee: meOption });
    }
  };

  const toggleStatus = (statusValue: string) => {
    const newExcluded = excludedStatuses.includes(statusValue)
      ? excludedStatuses.filter((s) => s !== statusValue)
      : [...excludedStatuses, statusValue];
    setExcludedStatuses(newExcluded);
    fetchTickets(undefined, { excludedStatuses: newExcluded });
  };

  const toggleAllOpen = () => {
    const allOpenShown = !openStatusValues.some((s) => excludedStatuses.includes(s));
    const newExcluded = allOpenShown
      ? [...new Set([...excludedStatuses, ...openStatusValues])]
      : excludedStatuses.filter((s) => !openStatusValues.includes(s));
    setExcludedStatuses(newExcluded);
    fetchTickets(undefined, { excludedStatuses: newExcluded });
  };

  const handleReset = () => {
    setPriority(null);
    setTicketType(null);
    setAssignedToMe(false);
    setAssignee(null);
    setEvent(null);
    setSortField(null);
    setSortDirection(null);
    setExcludedStatuses(defaultExcluded);
    fetchTickets(undefined, {
      priority: null,
      ticketType: null,
      assignee: null,
      event: null,
      sortField: null,
      sortDirection: null,
      excludedStatuses: defaultExcluded,
    });
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    fetchTickets(undefined, { sortField: field, sortDirection: direction });
  };

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (fixedType) {
      params.append("type", fixedType);
    } else if (ticketType) {
      params.append("type", ticketType);
    }
    if (assignee) params.append("assigned_to", String(assignee.id));
    if (event) params.append("event", String(event.id));
    if (priority) params.append("priority", priority);
    if (sortField && sortDirection) {
      params.append("ordering", sortDirection === "desc" ? `-${sortField}` : sortField);
    }
    if (excludedStatuses.length > 0) params.append("exclude_status", excludedStatuses.join(","));
    return params.toString();
  };

  const allOpenShown = !openStatusValues.some((s) => excludedStatuses.includes(s));

  return (
    <Container size="xl" py="xl">
      <Grid>
        <Grid.Col span={12}>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>{title}</Title>
            </Group>

            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group gap="xs">
                  <Badge
                    variant={allOpenShown ? "filled" : "outline"}
                    style={{ cursor: "pointer" }}
                    onClick={toggleAllOpen}
                  >
                    All
                  </Badge>
                  {statusBadges.map((s) => (
                    <Badge
                      key={s.value}
                      variant={excludedStatuses.includes(s.value) ? "outline" : "filled"}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleStatus(s.value)}
                    >
                      {s.label}
                    </Badge>
                  ))}
                  <Text c="dimmed">|</Text>
                  <Badge
                    color="gray"
                    variant={excludedStatuses.includes("COMPLETED") ? "outline" : "filled"}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleStatus("COMPLETED")}
                  >
                    Completed
                  </Badge>
                  <Badge
                    color="red"
                    variant={excludedStatuses.includes("CANCELED") ? "outline" : "filled"}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleStatus("CANCELED")}
                  >
                    Canceled
                  </Badge>
                </Group>

                <Group gap="md">
                  <Select
                    label="Priority"
                    value={priority}
                    onChange={(value) => {
                      setPriority(value);
                      fetchTickets(undefined, { priority: value });
                    }}
                    placeholder="All priorities"
                    clearable
                    data={priorities}
                    style={{ flex: 1 }}
                  />
                  {/* Only show Type dropdown when there are multiple types to choose from */}
                  {!fixedType && (
                    <Select
                      label="Type"
                      value={ticketType}
                      onChange={(value) => {
                        setTicketType(value);
                        fetchTickets(undefined, { ticketType: value });
                      }}
                      placeholder="All types"
                      clearable
                      data={ticketTypes}
                      style={{ flex: 1 }}
                    />
                  )}
                  <SearchSelect<UserResult>
                    endpoint="/api/users/"
                    label="Assignee"
                    placeholder="Search users…"
                    value={assignee}
                    onChange={setNewAssignee}
                    clearable
                    disabled={assignedToMe}
                    mapResult={(u) => ({
                      id: u.id,
                      label: u.first_name
                        ? `${u.first_name} ${u.last_name} (${u.username})`
                        : u.username,
                      raw: u,
                    })}
                  />
                  <SearchSelect<EventResult>
                    endpoint="/events"
                    label="Event"
                    placeholder="Search events…"
                    value={event}
                    onChange={(newEvent) => {
                      setEvent(newEvent);
                      fetchTickets(undefined, { event: newEvent });
                    }}
                    clearable
                    mapResult={(e) => ({ id: e.id, label: e.name, raw: e })}
                  />
                </Group>

                <Group gap="sm">
                  <Button
                    color="green"
                    variant={assignedToMe ? "filled" : "outline"}
                    onClick={toggleAssignedToMe}
                  >
                    Assigned to me
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <TicketTable
              tickets={tickets}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterParams={buildFilterParams()}
              onStatusToggle={() => {
                const hasExcludedClosed = closedStatusValues.some((s) =>
                  excludedStatuses.includes(s)
                );
                const hasExcludedOpen = openStatusValues.some((s) => excludedStatuses.includes(s));
                let newExcluded: string[];
                if (!hasExcludedOpen && hasExcludedClosed) {
                  newExcluded = [...openStatusValues];
                } else if (hasExcludedOpen && !hasExcludedClosed) {
                  newExcluded = [];
                } else {
                  newExcluded = [...closedStatusValues];
                }
                setExcludedStatuses(newExcluded);
                fetchTickets(undefined, { excludedStatuses: newExcluded });
              }}
            />

            <Paper p="sm" withBorder>
              <Group justify="space-between">
                <span>
                  {totalCount} {totalCount === 1 ? "ticket" : "tickets"} found
                </span>
                <Group gap="xs">
                  <ActionIcon
                    variant="filled"
                    disabled={!previousUrl}
                    onClick={() => previousUrl && fetchTickets(previousUrl)}
                    aria-label="Previous page"
                  >
                    <IconChevronLeft size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="filled"
                    disabled={!nextUrl}
                    onClick={() => nextUrl && fetchTickets(nextUrl)}
                    aria-label="Next page"
                  >
                    <IconChevronRight size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
