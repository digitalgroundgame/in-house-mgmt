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
  Timeline,
  Divider,
  Box,
  ActionIcon,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiClient";
import TicketTable, {
  type SortField,
  type SortDirection,
} from "@/app/components/tickets/TicketTable";
import ContactSearch from "@/app/components/ContactSearch";
import { useUser } from "@/app/components/provider/UserContext";
import { SearchSelect, type SearchSelectOption } from "@/app/components/SearchSelect";
import { type Ticket } from "@/app/components/tickets/ticket-utils";

interface UserResult {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
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

// TODO: /tickets/123 doesn't work, we should make sure the url reflects the current ticket
export default function TicketPage() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(defaultExcluded);
  const [priorities, setPriorities] = useState<{ value: string; label: string }[]>([]);
  const [priority, setPriority] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<SearchSelectOption<UserResult> | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    fetchTicketes();
    fetchPriorities();
  }, []);

  const fetchPriorities = async () => {
    try {
      const data = await apiClient.get<{ value: number; label: string }[]>("/ticket-priorities");
      // API returns [{value: number, label: string}, ...] - convert value to string for Select
      const priorityOptions = data.map((p) => ({
        value: String(p.value),
        label: p.label,
      }));
      setPriorities(priorityOptions);
    } catch (error) {
      console.error("Error fetching priorities:", error);
    }
  };

  const fetchTicketes = async (
    url?: string,
    overrides?: {
      priority?: string | null;
      ticketType?: string | null;
      assignee?: SearchSelectOption<UserResult> | null;
      sortField?: SortField;
      sortDirection?: SortDirection;
      excludedStatuses?: string[];
    }
  ) => {
    try {
      setLoading(true);
      let fetchPath = url?.replace(/^\/api/, "") || "/tickets";

      // Add filters if not using pagination URL
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
        const effectiveExcluded =
          overrides?.excludedStatuses !== undefined ? overrides.excludedStatuses : excludedStatuses;

        if (effectiveAssignee) {
          params.append("assigned_to", String(effectiveAssignee.id));
        }
        if (effectivePriority !== undefined && effectivePriority !== null) {
          params.append("priority", effectivePriority);
        }
        if (effectiveType) {
          params.append("type", effectiveType);
        }
        if (effectiveSortField && effectiveSortDirection) {
          const orderValue =
            effectiveSortDirection === "desc" ? `-${effectiveSortField}` : effectiveSortField;
          params.append("ordering", orderValue);
        }
        if (effectiveExcluded.length > 0) {
          params.append("exclude_status", effectiveExcluded.join(","));
        }
        if (params.toString()) {
          fetchPath = `/tickets?${params.toString()}`;
        }
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
    fetchTicketes(undefined, { assignee: newAssignee });
  };

  const toggleAssignedToMe = () => {
    if (assignedToMe) {
      setAssignedToMe(false);
      setAssignee(null);
      fetchTicketes(undefined, { assignee: null });
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
      fetchTicketes(undefined, { assignee: meOption });
    }
  };

  const toggleStatus = (statusValue: string) => {
    const newExcluded = excludedStatuses.includes(statusValue)
      ? excludedStatuses.filter((s) => s !== statusValue)
      : [...excludedStatuses, statusValue];
    setExcludedStatuses(newExcluded);
    fetchTicketes(undefined, { excludedStatuses: newExcluded });
  };

  const toggleAllOpen = () => {
    const allOpenShown = !openStatusValues.some((s) => excludedStatuses.includes(s));
    const newExcluded = allOpenShown
      ? [...new Set([...excludedStatuses, ...openStatusValues])]
      : excludedStatuses.filter((s) => !openStatusValues.includes(s));
    setExcludedStatuses(newExcluded);
    fetchTicketes(undefined, { excludedStatuses: newExcluded });
  };

  const handleReset = () => {
    setPriority(null);
    setTicketType(null);
    setAssignedToMe(false);
    setAssignee(null);
    setSortField(null);
    setSortDirection(null);
    setExcludedStatuses(defaultExcluded);
    fetchTicketes(undefined, {
      priority: null,
      ticketType: null,
      sortField: null,
      sortDirection: null,
      excludedStatuses: defaultExcluded,
    });
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    fetchTicketes(undefined, { sortField: field, sortDirection: direction });
  };

  const handleRowClick = (reach: Ticket) => {
    setSelectedTicket(reach);
  };

  const handleBackToTable = () => {
    setSelectedTicket(null);
  };

  // TODO: Use code in TicketesTable.tsx
  const getPriorityColor = (priority: number) => {
    if (priority < 1) return "red";
    if (priority < 3) return "orange";
    if (priority == 3) return "yellow";
    if (priority <= 5) return "gray";
    return "gray";
  };

  const allOpenShown = !openStatusValues.some((s) => excludedStatuses.includes(s));

  return (
    <Container size="xl" py="xl">
      <Grid>
        {/* Main Content Area */}
        <Grid.Col span={{ base: 12, md: selectedTicket ? 8 : 12 }}>
          <Stack gap="md">
            {/* Header */}
            <Group justify="space-between">
              <Title order={2}>
                {selectedTicket ? selectedTicket.title : "Ticket Queue Management"}
              </Title>
              {selectedTicket && (
                <Button variant="outline" onClick={handleBackToTable}>
                  Back to List
                </Button>
              )}
            </Group>

            {/* Status Filters */}
            {!selectedTicket && (
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
                        fetchTicketes(undefined, { priority: value });
                      }}
                      placeholder="All priorities"
                      clearable
                      data={priorities}
                      style={{ flex: 1 }}
                    />
                    <Select
                      label="Type"
                      value={ticketType}
                      onChange={(value) => {
                        setTicketType(value);
                        fetchTicketes(undefined, { ticketType: value });
                      }}
                      placeholder="All types"
                      clearable
                      data={[
                        { value: "UNKNOWN", label: "Unknown" },
                        { value: "INTRODUCTION", label: "Introduction" },
                        { value: "RECRUIT", label: "Recruit for event" },
                        { value: "CONFIRM", label: "Confirm participation" },
                      ]}
                      style={{ flex: 1 }}
                    />
                    <SearchSelect<UserResult>
                      endpoint="/api/users"
                      label="Assignee"
                      placeholder="Search users…"
                      value={assignee}
                      onChange={setNewAssignee}
                      clearable
                      disabled={assignedToMe}
                      mapResult={(user) => ({
                        id: user.id,
                        label: user.first_name
                          ? `${user.first_name} ${user.last_name} (${user.username})`
                          : user.username,
                        raw: user,
                      })}
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
            )}

            {/* Tickets Table or Call Instructions */}
            <>
              <TicketTable
                tickets={tickets}
                loading={loading}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onStatusToggle={() => {
                  const hasExcludedClosed = closedStatusValues.some((s) =>
                    excludedStatuses.includes(s)
                  );
                  const hasExcludedOpen = openStatusValues.some((s) =>
                    excludedStatuses.includes(s)
                  );

                  let newExcluded: string[];
                  if (!hasExcludedOpen && hasExcludedClosed) {
                    // Currently open view → switch to closed only
                    newExcluded = [...openStatusValues];
                  } else if (hasExcludedOpen && !hasExcludedClosed) {
                    // Currently closed view → switch to all
                    newExcluded = [];
                  } else {
                    // Mixed or all → switch to open only (default)
                    newExcluded = [...closedStatusValues];
                  }
                  setExcludedStatuses(newExcluded);
                  fetchTicketes(undefined, { excludedStatuses: newExcluded });
                }}
              />

              {/* Pagination and count */}
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <span>
                    {totalCount} {totalCount === 1 ? "ticket" : "tickets"} found
                  </span>
                  <Group gap="xs">
                    <ActionIcon
                      variant="filled"
                      disabled={!previousUrl}
                      onClick={() => previousUrl && fetchTicketes(previousUrl)}
                      aria-label="Previous page"
                    >
                      <IconChevronLeft size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="filled"
                      disabled={!nextUrl}
                      onClick={() => nextUrl && fetchTicketes(nextUrl)}
                      aria-label="Next page"
                    >
                      <IconChevronRight size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            </>
            {/* Activity Section - Only show when reach is selected */}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
