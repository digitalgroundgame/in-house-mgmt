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
  Textarea,
  ScrollArea,
  Avatar,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { getStatusColor, getPriorityColor } from "./TicketTable";
import TicketDescription from "./TicketDescription";
import { Ticket, TicketType } from "./ticket-utils";
import ContactSearch, { Contact } from "@/app/components/ContactSearch";
import { SearchSelect, SearchSelectOption } from "@/app/components/SearchSelect";
import { EnumSelect, EnumSelectOption } from "@/app/components/EnumSelect";
import { useUser } from "@/app/components/provider/UserContext";
import { Event } from "@/app/components/event-utils";
import { apiClient } from "@/app/lib/apiClient";
import TicketActions from "@/app/components/tickets/TicketActions";
import { formatDateTime } from "@/app/utils/datetime";

export type TimelineShowType = "all" | "comment" | "audit" | "event_participation";

export interface TimelineEntry {
  type: TimelineShowType;
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
  setTimeline?: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
}

export default function TicketView({
  ticket,
  timeline,
  timelineLoading,
  showType,
  onShowTypeChange,
  setTimeline,
}: TicketViewProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        if (ticket.contact) {
          try {
            setContact(await apiClient.get(`/contacts/${ticket.contact}/`));
          } catch {
            setContact(null);
          }
        }

        if (ticket.event) {
          try {
            setEvent(await apiClient.get(`/events/${ticket.event}/`));
          } catch {
            setEvent(null);
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
            <TicketDescription description={ticket.description} />
            <TicketTimeline
              timeline={timeline}
              loading={timelineLoading}
              showType={showType}
              onShowTypeChange={onShowTypeChange}
              ticketId={ticket.id}
              setTimeline={setTimeline}
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <TicketMetadataCard ticket={ticket} />
            <TicketActions
              ticket={ticket}
              contact={contact ?? undefined}
              event={event ?? undefined}
            />
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

function TitleCard({ ticket }: { ticket: Ticket }) {
  return <Title order={2}>{ticket.title}</Title>;
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

  const canEditAssignedTo = ticket.editable_fields?.includes("assigned_to") ?? false;
  const canEditStatus = ticket.editable_fields?.includes("ticket_status") ?? false;
  const canEditContact = ticket.editable_fields?.includes("contact") ?? false;
  const canEditEvent = ticket.editable_fields?.includes("event") ?? false;
  const canEditPriority = ticket.editable_fields?.includes("priority") ?? false;
  const canEditTicketType = ticket.editable_fields?.includes("ticket_type") ?? false;

  const [assignedTo, setAssignedTo] = useState<SearchSelectOption<{
    id: number;
    username: string;
  }> | null>(
    ticket.assigned_to
      ? {
          id: ticket.assigned_to,
          label: ticket.assigned_to_username ?? String(ticket.assigned_to),
          raw: null,
        }
      : null
  );

  const [contact, setContact] = useState<SearchSelectOption<{
    id: number;
    full_name: string;
  }> | null>(
    ticket.contact
      ? { id: ticket.contact, label: ticket.contact_display ?? String(ticket.contact), raw: null }
      : null
  );

  const [event, setEvent] = useState<SearchSelectOption<{ id: number; name: string }> | null>(
    ticket.event
      ? { id: ticket.event, label: ticket.event_display ?? String(ticket.event), raw: null }
      : null
  );

  const [ticketStatus, setTicketStatus] = useState<EnumSelectOption<TicketStatus> | null>({
    id: ticket.ticket_status,
    label: ticket.status_display ?? "",
    hidden: false,
    color: getStatusColor(ticket.ticket_status),
  });

  const [priority, setPriority] = useState<EnumSelectOption<TicketType> | null>({
    id: ticket.priority.toString(),
    label: ticket.priority_display ?? "",
    hidden: false,
    color: getPriorityColor(ticket.priority),
  });

  const [ticketType, setTicketType] = useState<EnumSelectOption<TicketType> | null>({
    id: ticket.ticket_type,
    label: ticket.type_display ?? "",
    hidden: false,
  });

  const handleClaimToggle = async () => {
    setLoading(true);
    try {
      if (isClaimed) {
        await apiClient.delete(`/tickets/${ticket.id}/claim/`);
      } else {
        await apiClient.post(`/tickets/${ticket.id}/claim/`, {});
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to update ticket claim status");
    } finally {
      setLoading(false);
    }
  };

  const upsertTicketStatus = async (status: EnumSelectOption<TicketStatus> | null) => {
    if (!status) return;
    try {
      await apiClient.patch(`/tickets/${ticket.id}/status/`, {
        ticket_status: status.id,
      });
      setTicketStatus(status);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const upsertAssignedTo = async (
    option: SearchSelectOption<{ id: number; username: string }> | null
  ) => {
    try {
      await apiClient.patch(`/tickets/${ticket.id}/assign/`, {
        assigned_to: option?.raw?.id ?? null,
      });
      setAssignedTo(option);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating assigned_to");
    }
  };

  const upsertContact = async (
    option: SearchSelectOption<{ id: number; full_name: string }> | null
  ) => {
    try {
      await apiClient.patch(`/tickets/${ticket.id}/`, {
        contact: option?.raw?.id ?? null,
      });
      setContact(option);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating contact");
    }
  };

  const upsertEvent = async (option: SearchSelectOption<{ id: number; name: string }> | null) => {
    try {
      await apiClient.patch(`/tickets/${ticket.id}/`, {
        event: option?.raw?.id ?? null,
      });
      setEvent(option);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating event");
    }
  };

  const upsertPriority = async (option: EnumSelectOption<TicketType> | null) => {
    if (!option) return;
    try {
      await apiClient.patch(`/tickets/${ticket.id}/`, {
        priority: option.id,
      });
      setPriority(option);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating priority");
    }
  };

  const upsertTicketType = async (option: EnumSelectOption<TicketType> | null) => {
    if (!option) return;
    try {
      await apiClient.patch(`/tickets/${ticket.id}/`, {
        ticket_type: option.id,
      });
      setTicketType(option);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error updating ticket type");
    }
  };

  const mapUserToOption = (user: {
    id: number;
    username: string;
  }): SearchSelectOption<{ id: number; username: string }> => ({
    id: user.id,
    label: user.username,
    raw: user,
  });

  const mapContactToOption = (contact: {
    id: number;
    full_name: string;
  }): SearchSelectOption<{ id: number; full_name: string }> => ({
    id: contact.id,
    label: contact.full_name,
    raw: contact,
  });

  const mapEventToOption = (event: {
    id: number;
    name: string;
  }): SearchSelectOption<{ id: number; name: string }> => ({
    id: event.id,
    label: event.name,
    raw: event,
  });

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
            endpoint="/api/ticket-statuses/"
            value={ticketStatus}
            onChange={upsertTicketStatus}
            mapResult={(status) => ({
              id: status.value,
              label: status.label,
              hidden: status.value === "OPEN", // HIDE opened option in UI
              color: getStatusColor(status.value),
            })}
            disabled={!canEditStatus}
          />
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Priority
          </Text>
          {canEditPriority ? (
            <EnumSelect<TicketType>
              endpoint="/api/ticket-priorities/"
              value={priority}
              onChange={upsertPriority}
              mapResult={(p) => ({
                id: p.value,
                label: p.label,
                hidden: false,
                color: getPriorityColor(parseInt(p.value, 10)),
              })}
            />
          ) : (
            <Badge variant="light" color={getPriorityColor(ticket.priority)} mt={4}>
              {ticket.priority_display}
            </Badge>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Claimed By
          </Text>
          {canEditAssignedTo ? (
            <SearchSelect<{ id: number; username: string }>
              endpoint="/api/users/"
              label={""}
              value={assignedTo}
              onChange={upsertAssignedTo}
              mapResult={mapUserToOption}
              placeholder="Select user..."
              clearable
            />
          ) : ticket.assigned_to_username ? (
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
          {canEditTicketType ? (
            <EnumSelect<TicketType>
              endpoint="/api/ticket-types/"
              value={ticketType}
              onChange={upsertTicketType}
              mapResult={(t) => ({
                id: t.value,
                label: t.label,
                hidden: false,
              })}
            />
          ) : (
            <Text size="sm" mt={4}>
              {ticket.type_display}
            </Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Text size="sm" c="dimmed">
            Contact
          </Text>
          {canEditContact ? (
            <SearchSelect<{ id: number; full_name: string }>
              endpoint="/api/contacts/"
              label=""
              value={contact}
              onChange={upsertContact}
              mapResult={mapContactToOption}
              placeholder="Select contact..."
              clearable
            />
          ) : ticket.contact ? (
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
          {canEditEvent ? (
            <SearchSelect<{ id: number; name: string }>
              endpoint="/api/events/"
              label=""
              value={event}
              onChange={upsertEvent}
              mapResult={mapEventToOption}
              placeholder="Select event..."
              clearable
            />
          ) : ticket.event ? (
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
  ticketId: number;
  onRefresh?: () => void;
  setTimeline?: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
}

function ResolvedName({ field, id }: { field: string; id: string }) {
  const [name, setName] = useState<string>(() => (!id || id === "None" ? "None" : id));

  useEffect(() => {
    if (!id || id === "None") {
      return;
    }

    let path: string;
    if (field === "contact") {
      path = `/contacts/${id}`;
    } else if (field === "event") {
      path = `/events/${id}`;
    } else if (field === "user") {
      path = `/users/${id}/`;
    } else {
      return;
    }

    apiClient
      .get<Record<string, string>>(path)
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

function TicketTimeline({
  timeline,
  loading,
  showType,
  onShowTypeChange,
  ticketId,
  setTimeline,
}: TicketTimelineProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/tickets/${ticketId}/comment/`, {
        message: commentText.trim(),
        ticket: ticketId,
      });
      setCommentText("");
      // Refresh timeline with current tab filter
      const data = await apiClient.get<TimelineEntry[] | { results: TimelineEntry[] }>(
        `/tickets/${ticketId}/timeline/?show=${showType}`
      );
      setTimeline?.(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const showCommentInput = showType === "all" || showType === "comment";

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
                {formatDateTime(entry.created_at)}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      {showCommentInput && (
        <Group align="flex-end" gap="sm" mt="md">
          <Textarea
            placeholder="Add a comment"
            style={{ flex: 1 }}
            autosize
            minRows={2}
            maxRows={5}
            value={commentText}
            onChange={(e) => setCommentText(e.currentTarget.value)}
          />
          <Button
            leftSection={<IconSend size={16} />}
            loading={submitting}
            disabled={!commentText.trim()}
            onClick={handleCommentSubmit}
          >
            Send
          </Button>
        </Group>
      )}
    </Paper>
  );
}

interface CommentEntry {
  created_at: string;
  actor_display: string | null;
  message: string;
}

function TicketComments({ ticketId }: { ticketId: number }) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<CommentEntry[] | { results: CommentEntry[] }>(
        `/tickets/${ticketId}/timeline/?show=comment`
      );
      setComments(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/tickets/${ticketId}/comment/`, {
        message: commentText.trim(),
        ticket: ticketId,
      });
      setCommentText("");
      await fetchComments();
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="md">
        Comments
      </Title>

      <ScrollArea h={300} mb="md">
        {loading ? (
          <Center h={100}>
            <Loader size="sm" />
          </Center>
        ) : comments.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            No comments yet.
          </Text>
        ) : (
          <Stack gap="sm">
            {comments.map((c, i) => (
              <Box key={i}>
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" radius="xl" color="blue">
                    {(c.actor_display || "?")[0].toUpperCase()}
                  </Avatar>
                  <Box style={{ flex: 1 }}>
                    <Group gap="xs" mb={2}>
                      <Text size="sm" fw={600}>
                        {c.actor_display ?? "Unknown"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(c.created_at)}
                      </Text>
                    </Group>
                    <Text size="sm">{c.message}</Text>
                  </Box>
                </Group>
                {i < comments.length - 1 && <Divider mt="sm" />}
              </Box>
            ))}
          </Stack>
        )}
      </ScrollArea>

      <Group align="flex-end" gap="sm">
        <Textarea
          placeholder="Add a comment"
          style={{ flex: 1 }}
          autosize
          minRows={2}
          maxRows={5}
          value={commentText}
          onChange={(e) => setCommentText(e.currentTarget.value)}
        />
        <Button
          leftSection={<IconSend size={16} />}
          loading={submitting}
          disabled={!commentText.trim()}
          onClick={handleSubmit}
        >
          Send
        </Button>
      </Group>
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
