"use client";
import Link from "next/link";

import { useState, useEffect, JSX } from "react";
import {
  Grid,
  Stack,
  Group,
  Title,
  Button,
  Paper,
  Box,
  Badge,
  Divider,
  Text,
  Timeline,
  Container,
  SegmentedControl,
  Loader,
  Center,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { getStatusColor, getPriorityColor } from "./TicketTable";
import TicketDescription from "./TicketDescription";
import { Ticket } from "./ticket-utils";
import ContactSearch, { Contact } from "./ContactSearch";
import { SearchSelect, SearchSelectOption } from "@/app/components/SearchSelect";
import { EnumSelect, EnumSelectOption } from "@/app/components/EnumSelect";
import { useUser } from "@/app/components/provider/UserContext";
import { Event } from "@/app/components/event-utils";
import getCookie from "@/app/utils/cookie";
import TicketActions from "@/app/components/tickets/TicketActions";

export type TimelineShowType = "all" | "comments" | "audit" | "event_participation";

interface TimelineEntry {
  type: "audit" | "comment" | "event_participation";
  created_at: string;
  actor_display: string | null;
  actor_id: number | null;
  changes?: Record<string, [string, string]>;
  message?: string;
}

interface TicketStatus {
  value: string;
  label: string;
}

interface TicketViewProps {
  ticket: Ticket;
  timeline: TimelineEntry[];
  timelineLoading: boolean;
  showType: TimelineShowType;
  onShowTypeChange: (value: TimelineShowType) => void;
}

export default function TicketView({
  ticket,
  timeline,
  timelineLoading,
  showType,
  onShowTypeChange,
}: TicketViewProps) {
  const [contact, setContact] = useState<Contact>(null);
  const [event, setEvent] = useState<Event>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        if (ticket.contact) {
          const contactRes = await fetch(`/api/contacts/${ticket.contact}`);
          if (contactRes.ok) {
            setContact(await contactRes.json());
          } else if (contactRes.status === 404) {
            setContact({
              id: ticket.contact,
              name: "UNKNOWN",
            });
          }
        }

        if (ticket.event) {
          const eventRes = await fetch(`/api/events/${ticket.event}`);
          if (eventRes.ok) {
            setEvent(await eventRes.json());
          } else if (eventRes.status === 404) {
            setEvent({
              id: ticket.event,
              name: "UNKNOWN",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch associated contact/event", err);
      }
    }

    fetchInfo();
  }, [ticket.contact, ticket.event]);

  return (
    <Container size="xl" py="xl">
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <TitleCard ticket={ticket} />
            {/* Status Info */}
            <TicketDescription description={ticket.description} />
            <TicketTimeline
              timeline={timeline}
              loading={timelineLoading}
              showType={showType}
              onShowTypeChange={onShowTypeChange}
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <TicketMetadataCard ticket={ticket} />
            <TicketActions ticket={ticket} contact={contact} event={event} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

function TitleCard({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  return (
    <Group justify="space-between">
      <Title order={2}>{ticket.title}</Title>
      <Button variant="outline" onClick={() => router.back()}>
        Back to List
      </Button>
    </Group>
  );
}

function CallInstructionsCard({ ticket }: { ticket: Ticket }) {
  return (
    <Paper p="md" withBorder style={{ position: "relative", minHeight: "400px" }}>
      <Stack gap="md">
        <Title order={4}>Call Instructions</Title>

        <Box>
          <Text size="sm" c="dimmed" mb="xs">
            Description
          </Text>
          <Paper p="md" bg="gray.0" style={{ borderRadius: "4px" }}>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </Text>
          </Paper>
        </Box>

        <ol style={{ paddingLeft: "1.5rem" }}>
          <li>Review the reach details and requirements</li>
          <li>Contact the assigned person or team</li>
          <li>Discuss the reach objectives and timeline</li>
          <li>Update the reach status based on the outcome</li>
          <li>Mark follow-up actions if needed</li>
        </ol>
      </Stack>
    </Paper>
  );
}

function TicketMetadataCard({ ticket }: { ticket: Ticket }) {
  const [loading, setLoading] = useState(false);
  const isClaimed = Boolean(ticket.assigned_to);
  const { user } = useUser();

  const [ticketStatus, setTicketStatus] = useState<EnumSelectOption>({
    id: ticket.ticket_status,
    label: ticket?.status_display,
    color: getStatusColor(ticket.ticket_status),
  });

  const handleClaimToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/claim`, {
        credentials: "include",
        method: isClaimed ? "DELETE" : "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken")!,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update claim status");
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to update ticket claim status");
    } finally {
      setLoading(false);
    }
  };

  const upsertTicketStatus = async (status) => {
    console.log("status", status);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          "X-CSRFToken": getCookie("csrftoken")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_status: status.id,
        }),
      });
      if (res.ok) {
        setTicketStatus(status);
      } else {
        throw new Error("Failed to upsert ticket status");
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error upserting ticket status");
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Button
          fullWidth
          loading={loading}
          color={isClaimed ? "gray" : "blue"}
          variant={isClaimed ? "outline" : "filled"}
          onClick={handleClaimToggle}
        >
          {isClaimed ? "Unclaim Ticket" : "Claim Ticket"}
        </Button>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Status
          </Text>
          <EnumSelect<TicketStatus>
            endpoint="/api/ticket-statuses"
            value={ticketStatus}
            onChange={upsertTicketStatus}
            mapResult={(status) => ({
              id: status.value,
              label: status.label,
              hidden: status.value === "OPEN", // HIDE opened option in UI
              color: getStatusColor(status.value),
            })}
            disabled={user && ticket.assigned_to !== user.id}
          />
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Priority
          </Text>
          <Badge variant="light" color={getPriorityColor(ticket.priority)} mt={4}>
            {ticket.priority_display}
          </Badge>
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Claimed By
          </Text>
          {ticket.assigned_to_username ? (
            <Text
              size="sm"
              mt={4}
              fw={ticket.assigned_to === user?.id ? 600 : undefined}
              c={!ticket.assigned_to ? "dimmed" : undefined}
            >
              {ticket.assigned_to_username ?? ticket.assigned_to ?? "None"}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>
              None
            </Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Reported By
          </Text>
          {ticket.reported_by_username ? (
            <Text size="sm" mt={4}>
              {ticket.reported_by_username}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>
              None
            </Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Type
          </Text>
          <Text size="sm" mt={4}>
            {ticket.type_display}
          </Text>
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Contact
          </Text>
          {ticket.contact ? (
            <Link href={`/contacts/${ticket.contact}`}>
              <Text size="sm" mt={4}>
                {ticket.contact_display}
              </Text>
            </Link>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>
              None
            </Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Event
          </Text>
          {ticket.event ? (
            <Link href={`/events/${ticket.event}`}>
              <Text size="sm" mt={4}>
                {ticket.event_display}
              </Text>
            </Link>
          ) : (
            <Text size="sm" c="dimmed" mt={4}>
              None
            </Text>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

interface TicketTimelineProps {
  timeline: TimelineEntry[];
  loading: boolean;
  showType: TimelineShowType;
  onShowTypeChange: (value: TimelineShowType) => void;
}

function ResolvedName({ field, id }: { field: string; id: string }) {
  const [name, setName] = useState<string>(() => (!id || id === "None" ? "None" : id));

  useEffect(() => {
    if (!id || id === "None") {
      return;
    }

    let endpoint: string;
    if (field === "contact") {
      endpoint = `/api/contacts/${id}`;
    } else if (field === "event") {
      endpoint = `/api/events/${id}`;
    } else if (field === "user") {
      endpoint = `/api/users/${id}/`;
    } else {
      return;
    }

    fetch(endpoint, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (field === "contact") setName(data.full_name);
          else if (field === "event") setName(data.name);
          else if (field === "user") setName(data.username);
        }
      })
      .catch(() => setName(id));
  }, [field, id]);

  return <>{name}</>;
}

function TicketTimeline({ timeline, loading, showType, onShowTypeChange }: TicketTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEntryTitle = (entry: TimelineEntry) => {
    switch (entry.type) {
      case "audit":
        return "Ticket updated";
      case "event_participation":
        return "Event Participation Changed";
      case "comment":
        return `${entry.actor_display} left a comment`;
      default:
        return `Comment added`;
    }
  };

  const renderChangeValue = (field: string, value: string) => {
    if ((field === "contact" || field === "event") && value && value !== "None") {
      return <ResolvedName field={field} id={value} />;
    }
    return value || "None";
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>Activity</Title>
        <SegmentedControl
          size="xs"
          value={showType}
          onChange={(value) => onShowTypeChange(value as TimelineShowType)}
          data={[
            { label: "All", value: "all" },
            { label: "Comments", value: "comment" },
            { label: "Audit", value: "audit" },
            { label: "Event Participation", value: "event_participation" },
          ]}
        />
      </Group>
      {loading ? (
        <Center h={100}>
          <Loader size="sm" />
        </Center>
      ) : timeline.length === 0 ? (
        <Text c="dimmed" size="sm">
          No activity yet
        </Text>
      ) : (
        <Timeline active={timeline.length - 1} bulletSize={24} lineWidth={2}>
          {timeline.map((entry, index) => (
            <Timeline.Item key={index} title={getEntryTitle(entry)}>
              {entry.type === "comment" && entry.message && (
                <Text size="sm" mb={4}>
                  {entry.message}
                </Text>
              )}
              {entry.type === "audit" && entry.changes && typeof entry.changes === "object" && (
                <AuditLogTimelineItem entry={entry} renderChangeValue={renderChangeValue} />
              )}
              {entry.type === "event_participation" &&
                entry.changes &&
                typeof entry.changes === "object" && (
                  <AuditLogTimelineItem entry={entry} renderChangeValue={renderChangeValue} />
                )}
              <Text c="dimmed" size="sm">
                {entry.actor_display ?? "System"}
              </Text>
              <Text size="xs" mt={4}>
                {formatDate(entry.created_at)}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Paper>
  );
}

function AuditLogTimelineItem({
  entry,
  renderChangeValue,
}: {
  entry: TimelineEntry;
  renderChangeValue: (field: string, old: string) => string | JSX.Element;
}) {
  return (
    <Stack gap={2} mb={4}>
      {Object.entries(entry.changes!).map(([field, [oldVal, newVal]]) => (
        <Text key={field} size="sm" c="dimmed">
          <Text span fw={500}>
            {field}:
          </Text>{" "}
          {renderChangeValue(field, oldVal)} → {renderChangeValue(field, newVal)}
        </Text>
      ))}
    </Stack>
  );
}
