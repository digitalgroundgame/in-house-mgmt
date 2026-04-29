import { Contact } from "@/app/components/ContactSearch";
import Link from "next/link";
import PaginatedTable from "@/app/components/pagination/PaginatedTable";
import PaginationBar, {
  decrementPageSearchParam,
  incrementPageSearchParam,
} from "@/app/components/pagination/PaginationBar";
import { formatContactInfo } from "@/app/components/contact-utils";
import { User } from "@/app/components/provider/types";
import { useUser } from "@/app/components/provider/UserContext";
import { type Ticket } from "@/app/components/tickets/ticket-utils";
import {
  Event,
  EventParticipation,
  getStatusColor,
  getEventParticipationStatusColor,
  UsersInEvent,
} from "@/app/components/event-utils";
import { BackendPaginatedResults, useBackend, useBackendMutation } from "@/app/lib/api";
import { apiClient } from "@/app/lib/apiClient";
import { DateTimePicker } from "@/app/components/datetime";
import { type UseFormReturnType, useForm } from "@mantine/form";
import {
  Text,
  Paper,
  Container,
  Stack,
  Divider,
  Title,
  Grid,
  GridCol,
  Box,
  Badge,
  LoadingOverlay,
  Table,
  TextInput,
  Group,
  MultiSelect,
  Button,
  Modal,
  Select,
  Combobox,
  useCombobox,
  Tabs,
  Textarea,
  ActionIcon,
  Tooltip,
  Alert,
} from "@mantine/core";
import { IconPencil, IconSearch, IconTicket } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import getCookie from "@/app/utils/cookie";
import { formatBackendProvidedDateTime } from "@/app/utils/datetime";
const EVENT_PARTICIPATION_STATUSES = [
  "UNKNOWN",
  "MAYBE",
  "COMMITTED",
  "REJECTED",
  "ATTENDED",
  "NO_SHOW",
] as const;
type EventParticipationStatus = (typeof EVENT_PARTICIPATION_STATUSES)[number];
const FINAL_EVENT_STATUSES = new Set(["completed", "canceled"]);
const INVALID_FINAL_ATTENDANCE_STATUSES = new Set<EventParticipationStatus>([
  "UNKNOWN",
  "MAYBE",
  "COMMITTED",
]);

function isFinalEventStatus(status: string) {
  return FINAL_EVENT_STATUSES.has(status);
}

function hasInvalidFinalAttendanceStatus(status: string) {
  return INVALID_FINAL_ATTENDANCE_STATUSES.has(status as EventParticipationStatus);
}

interface EventEditFormValues {
  name: string;
  description: string;
  status: string;
  locationName: string;
  locationAddress: string;
  startsAt: string;
  endsAt: string;
}

function getEventFormValues(event: Event): EventEditFormValues {
  return {
    name: event.name,
    description: event.description ?? "",
    status: event.event_status,
    locationName: event.location_name ?? "",
    locationAddress: event.location_address ?? "",
    startsAt: event.starts_at,
    endsAt: event.ends_at,
  };
}

export default function EventView({ event }: { event: Event | undefined }) {
  return (
    <Container py="xl" size="xl">
      <LoadingOverlay visible={!event} />
      {event && <EventViewMain event={event} />}
    </Container>
  );
}

function EventViewMain({ event }: { event: Event }) {
  const [currentEvent, setCurrentEvent] = useState(event);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEventEdits, setIsSavingEventEdits] = useState(false);
  const [attendanceValidationError, setAttendanceValidationError] = useState<string | null>(null);
  const form = useForm<EventEditFormValues>({
    initialValues: getEventFormValues(event),
  });

  const canEditEvent = (currentEvent.editable_fields?.length ?? 0) > 0;

  const updateEvent = async (payload: Partial<Event>): Promise<Event> => {
    const updated = await apiClient.patch<Event>(`/events/${currentEvent.id}`, payload);
    setCurrentEvent(updated);
    return updated;
  };

  const saveEventEdits = async () => {
    setIsSavingEventEdits(true);
    try {
      const updated = await updateEvent({
        name: form.values.name,
        description: form.values.description,
        event_status: form.values.status,
        location_name: form.values.locationName,
        location_address: form.values.locationAddress,
        starts_at: form.values.startsAt,
        ends_at: form.values.endsAt,
      });
      const values = getEventFormValues(updated);
      form.setValues(values);
      form.resetDirty(values);
      setAttendanceValidationError(null);

      notifications.show({
        title: "Event updated",
        message: "Saved event changes.",
        color: "green",
      });
      setIsEditing(false);
    } catch (error) {
      setAttendanceValidationError(
        error instanceof Error ? error.message : "Could not update the event details."
      );
    } finally {
      setIsSavingEventEdits(false);
    }
  };

  const cancelEditing = () => {
    const values = getEventFormValues(currentEvent);
    form.setValues(values);
    form.resetDirty(values);
    setAttendanceValidationError(null);
    setIsEditing(false);
  };

  return (
    <Grid align="flex-start">
      <GridCol style={{ flex: 1, minWidth: 0 }}>
        {canEditEvent && (
          <Group justify="flex-end" mb="md">
            {!isEditing ? (
              <Tooltip label="Edit Event">
                <ActionIcon
                  size="md"
                  variant="filled"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit Event"
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <>
                <Button
                  size="xs"
                  onClick={saveEventEdits}
                  loading={isSavingEventEdits}
                  disabled={!form.isDirty()}
                >
                  Save
                </Button>
                <Button size="xs" variant="outline" color="red" onClick={cancelEditing}>
                  Cancel
                </Button>
              </>
            )}
          </Group>
        )}
        {attendanceValidationError && (
          <Alert
            color="red"
            mb="md"
            withCloseButton
            onClose={() => setAttendanceValidationError(null)}
          >
            {attendanceValidationError} Participants with unresolved attendance statuses are
            highlighted below.
          </Alert>
        )}
        <EventSummaryCard event={currentEvent} isEditing={isEditing} form={form} />
        <Tabs defaultValue="participants" mt="md">
          <Tabs.List>
            <Tabs.Tab value="participants">Participants</Tabs.Tab>
            <Tabs.Tab value="users">Users</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="participants" style={{ minWidth: "432px" }}>
            <EventViewContactTable event={currentEvent} />
          </Tabs.Panel>
          <Tabs.Panel value="users">
            <EventViewUsersTable event={currentEvent} />
          </Tabs.Panel>
        </Tabs>
      </GridCol>
      <GridCol style={{ flex: "0 0 239px", maxWidth: "239px", minWidth: "239px" }}>
        <Stack gap="md">
          <EventViewMetadata event={currentEvent} isEditing={isEditing} form={form} />
          <YourTicketCallout eventId={currentEvent.id} />
        </Stack>
      </GridCol>
    </Grid>
  );
}

function YourTicketCallout({ eventId }: { eventId: number }) {
  const { user, loading: userLoading } = useUser();
  const userId = user?.id;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userLoading || !userId) {
      setTickets([]);
      return;
    }

    let cancelled = false;

    async function fetchYourTicket() {
      setLoading(true);
      try {
        const data = await apiClient.get<BackendPaginatedResults<Ticket>>(
          `/tickets/?event=${eventId}&assigned_to=${userId}`
        );
        if (!cancelled) {
          setTickets(data.results);
        }
      } catch (error) {
        console.error("Failed to fetch current user's event ticket", error);
        if (!cancelled) {
          setTickets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchYourTicket();

    return () => {
      cancelled = true;
    };
  }, [eventId, userId, userLoading]);

  if (loading || tickets.length === 0) {
    return null;
  }

  const title =
    tickets.length === 1
      ? "You have a ticket for this event"
      : `You have ${tickets.length} tickets for this event`;

  return (
    <Alert
      color="blue"
      variant="light"
      styles={{
        root: { overflow: "hidden" },
        body: { minWidth: 0 },
        message: { minWidth: 0 },
      }}
    >
      <Stack gap="sm">
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <IconTicket size={18} style={{ flex: "0 0 auto", marginTop: 1 }} />
          <Text fw={700} size="sm" style={{ overflowWrap: "anywhere", lineHeight: 1.3 }}>
            {title}
          </Text>
        </Group>
        {tickets.map((ticket) => (
          <Button
            key={ticket.id}
            component={Link}
            href={`/tickets/${ticket.id}`}
            size="xs"
            variant="default"
            fullWidth
            styles={{
              root: {
                backgroundColor: "var(--mantine-color-white)",
                height: "auto",
                minHeight: 32,
                paddingTop: 8,
                paddingBottom: 8,
              },
              label: {
                color: "var(--mantine-color-black)",
                whiteSpace: "normal",
                textAlign: "left",
                overflowWrap: "anywhere",
                lineHeight: 1.3,
              },
            }}
          >
            {ticket.title}
          </Button>
        ))}
      </Stack>
    </Alert>
  );
}

function EventSummaryCard({
  event,
  isEditing,
  form,
}: {
  event: Event;
  isEditing: boolean;
  form: UseFormReturnType<EventEditFormValues>;
}) {
  const canEditName = event.editable_fields?.includes("name") ?? false;
  const canEditDescription = event.editable_fields?.includes("description") ?? false;
  const descriptionText = event.description?.trim() ?? "";
  const hasDescription = descriptionText.length > 0;

  return (
    <Box>
      <Stack gap="sm">
        {canEditName && isEditing ? (
          <TextInput
            {...form.getInputProps("name")}
            variant="unstyled"
            size="xl"
            styles={{
              input: {
                fontSize: "var(--mantine-h1-font-size)",
                fontWeight: 700,
                lineHeight: "var(--mantine-h1-line-height)",
                padding: 0,
              },
            }}
          />
        ) : (
          <Title>{event.name}</Title>
        )}
        {canEditDescription && isEditing ? (
          <>
            <Divider />
            <Textarea
              {...form.getInputProps("description")}
              autosize
              minRows={5}
              variant="unstyled"
              styles={{
                input: {
                  fontSize: "var(--mantine-font-size-md)",
                  lineHeight: "var(--mantine-line-height)",
                  padding: 0,
                },
              }}
            />
          </>
        ) : hasDescription ? (
          <>
            <Divider />
            <Text style={{ whiteSpace: "pre-wrap" }}>{descriptionText}</Text>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}

function EventViewMetadata({
  event,
  isEditing,
  form,
}: {
  event: Event;
  isEditing: boolean;
  form: UseFormReturnType<EventEditFormValues>;
}) {
  const canEditStatus = event.editable_fields?.includes("event_status") ?? false;
  const canEditLocation =
    (event.editable_fields?.includes("location_name") ?? false) ||
    (event.editable_fields?.includes("location_address") ?? false);
  const canEditDates =
    (event.editable_fields?.includes("starts_at") ?? false) ||
    (event.editable_fields?.includes("ends_at") ?? false);
  const metadataInputStyles = {
    input: {
      fontSize: "var(--mantine-font-size-md)",
      fontWeight: 400,
      lineHeight: "var(--mantine-line-height)",
      fontFamily: "var(--mantine-font-family)",
      color: "var(--mantine-color-text)",
      padding: 0,
    },
  } as const;

  return (
    <Paper withBorder p="sm">
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">
          Event Status
        </Text>
        {canEditStatus && isEditing ? (
          <Select
            data={[
              { value: "draft", label: "Draft" },
              { value: "scheduled", label: "Scheduled" },
              { value: "completed", label: "Completed" },
              { value: "canceled", label: "Canceled" },
            ]}
            value={form.values.status}
            onChange={(value) => form.setFieldValue("status", value ?? event.event_status)}
            variant="unstyled"
            size="md"
            styles={metadataInputStyles}
          />
        ) : (
          <Badge color={getStatusColor(event.status_display)}>{event.status_display}</Badge>
        )}
      </Box>
      <Box mt={4} mb={4}>
        {canEditLocation && isEditing ? (
          <>
            <Text c="dimmed" size="sm">
              Location Name
            </Text>
            <TextInput
              {...form.getInputProps("locationName")}
              placeholder="Location name"
              variant="unstyled"
              size="md"
              styles={metadataInputStyles}
            />
          </>
        ) : (
          <>
            <Text c="dimmed" size="sm">
              Location Display
            </Text>
            <Text>{event.location_display}</Text>
          </>
        )}
      </Box>
      {canEditLocation && isEditing && (
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Address
          </Text>
          <Textarea
            {...form.getInputProps("locationAddress")}
            autosize
            minRows={2}
            placeholder="Address"
            variant="unstyled"
            size="md"
            styles={metadataInputStyles}
          />
        </Box>
      )}
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">
          Start Date
        </Text>
        {canEditDates && isEditing ? (
          <DateTimePicker
            value={form.values.startsAt}
            valueFormat="MM/DD/YY, hh:mm A"
            timePickerProps={{ format: "12h" }}
            variant="unstyled"
            size="md"
            styles={metadataInputStyles}
            onChange={(value) => form.setFieldValue("startsAt", value ?? form.values.startsAt)}
          />
        ) : (
          <Text>{formatBackendProvidedDateTime(event.starts_at)}</Text>
        )}
      </Box>
      <Box mt={4} mb={4}>
        <Text c="dimmed" size="sm">
          End Date
        </Text>
        {canEditDates && isEditing ? (
          <DateTimePicker
            value={form.values.endsAt}
            valueFormat="MM/DD/YY, hh:mm A"
            timePickerProps={{ format: "12h" }}
            variant="unstyled"
            size="md"
            styles={metadataInputStyles}
            onChange={(value) => form.setFieldValue("endsAt", value ?? form.values.endsAt)}
          />
        ) : (
          <Text>{formatBackendProvidedDateTime(event.ends_at)}</Text>
        )}
      </Box>
    </Paper>
  );
}

function AddParticipantModal({
  event,
  selected,
  opened,
  close,
  refresh,
  mode,
}: {
  event: Event;
  selected?: EventParticipation[];
  opened: boolean;
  close: () => void;
  refresh: () => void;
  mode: "add" | "modify";
}) {
  const [contactSearchQuery, setContactSearchQuery] = useState<string>("");
  const [selectedContacts, setSelectedContacts] = useState<Set<Contact>>(
    new Set(selected?.map((ep) => ep.contact))
  );
  const [removedContactIds, setRemovedContactIds] = useState<Set<number>>(new Set());
  const [eventStatus, setEventStatus] = useState<EventParticipationStatus>();
  const [submitting, setSubmitting] = useState(false);
  const apiParams = new URLSearchParams();
  if (contactSearchQuery) apiParams.append("search", contactSearchQuery);
  const participationStatusOptions = isFinalEventStatus(event.event_status)
    ? EVENT_PARTICIPATION_STATUSES.filter((status) => !hasInvalidFinalAttendanceStatus(status))
    : EVENT_PARTICIPATION_STATUSES;

  const contactToParticipationMap = new Map<number, number>();
  if (mode === "modify" && selected) {
    for (const ep of selected) {
      contactToParticipationMap.set(ep.contact.id, ep.id);
    }
  }

  const contactsSearch = useBackend<BackendPaginatedResults<Contact>>(
    `/api/contacts/?${apiParams}`
  );
  const { mutate: createMutate, loading: createLoading } = useBackendMutation(
    `/api/participants/`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    }
  );
  const selectedContactIds: number[] = [];
  selectedContacts.forEach((c) => selectedContactIds.push(c.id));
  const contacts =
    mode === "add"
      ? contactsSearch.data?.results.filter((c) => !selectedContactIds.includes(c.id))
      : undefined;
  const combobox = useCombobox();
  const removeContact = (c: Contact) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      next.delete(c);
      return next;
    });
    setRemovedContactIds((prev) => new Set(prev).add(c.id));
  };

  const handleSubmit = async () => {
    if (!eventStatus) return;

    setSubmitting(true);

    try {
      if (mode === "add") {
        await Promise.all(
          Array.from(selectedContacts).map((c) =>
            createMutate({
              event_id: event.id,
              status: eventStatus,
              contact_id: c.id,
            })
          )
        );
      } else {
        for (const c of selectedContacts) {
          const participationId = contactToParticipationMap.get(c.id);
          if (participationId) {
            if (removedContactIds.has(c.id)) {
              const response = await fetch(`/api/participants/${participationId}/`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                  "X-CSRFToken": getCookie("csrftoken") ?? "",
                },
              });
              if (!response.ok) {
                notifications.show({
                  title: "Error",
                  message: "Failed to remove participant. Please try again.",
                  color: "red",
                });
                return;
              }
            } else {
              const response = await fetch(`/api/participants/${participationId}/`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRFToken": getCookie("csrftoken") ?? "",
                },
                body: JSON.stringify({ status: eventStatus }),
              });
              if (!response.ok) {
                notifications.show({
                  title: "Error",
                  message: "Failed to update participant. Please try again.",
                  color: "red",
                });
                return;
              }
            }
          }
        }
      }
      setSelectedContacts(new Set());
      setRemovedContactIds(new Set());
      close();
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={mode === "add" ? "Add Participant" : "Modify Selected"}
    >
      <LoadingOverlay visible={submitting || createLoading} />
      <Stack>
        {mode === "add" && (
          <Combobox
            store={combobox}
            onOptionSubmit={(value) => {
              const contact = contacts?.find((c) => c.id.toString() === value);
              if (!contact) return;

              setSelectedContacts((prev) => {
                const next = new Set(prev);
                next.add(contact);
                return next;
              });
              setContactSearchQuery("");
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                label="Contact"
                placeholder="Search contacts..."
                value={contactSearchQuery}
                onChange={(event) => {
                  setContactSearchQuery(event.currentTarget.value);
                  combobox.openDropdown();
                }}
                onFocus={() => combobox.openDropdown()}
                onClick={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
              />
            </Combobox.Target>

            <Combobox.Dropdown hidden={contacts === undefined || contacts.length === 0}>
              <Combobox.Options>
                {contacts?.map((contact) => (
                  <Combobox.Option key={contact.id} value={contact.id.toString()}>
                    {contact.full_name}
                  </Combobox.Option>
                ))}

                {contacts?.length === 0 && <Combobox.Empty>No contacts found</Combobox.Empty>}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        )}
        <Select
          data={participationStatusOptions}
          label="Participation Status"
          onChange={(s) => setEventStatus(s as EventParticipationStatus)}
          placeholder="Participation Status"
          required
          value={eventStatus}
        />
        <PaginatedTable<Contact>
          columns={["Full Name", "Discord ID", "Action"]}
          data={
            mode === "add"
              ? Array.from(selectedContacts)
              : Array.from(selectedContacts).filter((c) => !removedContactIds.has(c.id))
          }
          transforms={[
            (c) => <Table.Td key="name">{c.full_name}</Table.Td>,
            (c) => <Table.Td key="discord">{c.discord_id}</Table.Td>,
            (c) => (
              <Table.Td key="action">
                <Button color="red" onClick={() => removeContact(c)}>
                  Deselect
                </Button>
              </Table.Td>
            ),
          ]}
          loading={false}
          noDataText="Select a participant to proceed"
        />
        <Button onClick={handleSubmit} disabled={!eventStatus || submitting}>
          Submit
        </Button>
      </Stack>
    </Modal>
  );
}

function ParticipationStatusBadge({
  status,
  label,
  centered = false,
}: {
  status: string;
  label: string;
  centered?: boolean;
}) {
  return (
    <Badge
      color={getEventParticipationStatusColor(status)}
      styles={{
        root: {
          whiteSpace: "nowrap",
          width: "max-content",
          minWidth: "max-content",
          ...(centered && { margin: "0 auto" }),
        },
      }}
    >
      {label}
    </Badge>
  );
}

interface StagedEventListItem {
  id: number;
  discord_event_id: string;
  event_name: string;
  modified_at: string;
  importable_count: number;
  no_contact_count: number;
}

interface PreviewParticipant {
  staged_participation_id: number;
  discord_id: string;
  discord_name: string;
  status: string;
  has_contact: boolean;
  already_on_event: boolean;
}

interface PreviewResponse {
  staged_event_id: number;
  event_name: string;
  participants: PreviewParticipant[];
}

function BulkUploadModal({
  opened,
  close,
  refresh,
  eventId,
}: {
  opened: boolean;
  close: () => void;
  refresh: () => void;
  eventId: number;
}) {
  const [selectedStagedId, setSelectedStagedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: stagedList, loading: listLoading } = useBackend<StagedEventListItem[]>(
    "/api/discord/staged-events/mine/"
  );

  useEffect(() => {
    if (!selectedStagedId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    apiClient
      .get<PreviewResponse>(
        `/discord/staged-events/${selectedStagedId}/preview/?target_event_id=${eventId}`
      )
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPreview(null);
          notifications.show({
            title: "Couldn't load preview",
            message: err.message,
            color: "red",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStagedId, eventId]);

  let willAddCount = 0;
  let alreadyOnEventCount = 0;
  let noContactCount = 0;
  for (const p of preview?.participants ?? []) {
    if (!p.has_contact) noContactCount++;
    if (p.has_contact) {
      if (p.already_on_event) alreadyOnEventCount++;
      else willAddCount++;
    }
  }
  const importableCount = willAddCount + alreadyOnEventCount;

  const handleSubmit = async () => {
    if (!selectedStagedId) return;
    setSubmitting(true);
    try {
      const result = await apiClient.post<{
        imported: number;
        already_on_event: number;
        skipped_no_contact: number;
      }>(`/discord/staged-events/${selectedStagedId}/import/`, {
        target_event_id: eventId,
      });
      notifications.show({
        title: "Import complete",
        message: `${result.imported} imported. ${result.already_on_event} already on event. ${result.skipped_no_contact} skipped (no CRM contact).`,
        color: "green",
      });
      close();
      refresh();
    } catch (err) {
      notifications.show({
        title: "Import failed",
        message: err instanceof Error ? err.message : String(err),
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Bulk Upload by Event" size="xl">
      <LoadingOverlay visible={listLoading || submitting} />
      <Stack>
        <Select
          label="Source: staged event you tracked in Discord"
          placeholder={
            stagedList && stagedList.length === 0
              ? "You haven't tracked any events yet"
              : "Pick a staged event"
          }
          data={
            stagedList?.map((s) => ({
              value: s.id.toString(),
              label: `${s.event_name} — ${s.importable_count} ready, ${s.no_contact_count} no contact`,
            })) ?? []
          }
          value={selectedStagedId}
          onChange={setSelectedStagedId}
          disabled={!stagedList || stagedList.length === 0}
        />

        {loadingPreview && <Text>Loading participants…</Text>}

        {preview && !loadingPreview && (
          <>
            <Text size="sm">
              <strong>{willAddCount}</strong> will be imported.{" "}
              {alreadyOnEventCount > 0 && (
                <>
                  <strong>{alreadyOnEventCount}</strong> already on this event (no duplicates will
                  be created).{" "}
                </>
              )}
              {noContactCount > 0 && (
                <>
                  <strong>{noContactCount}</strong> have no CRM contact and will be skipped.
                </>
              )}
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Discord Name</Table.Th>
                  <Table.Th>Discord ID</Table.Th>
                  <Table.Th ta="center">Status</Table.Th>
                  <Table.Th ta="center">State</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {preview.participants.map((p) => {
                  let stateBadge;
                  if (!p.has_contact) {
                    stateBadge = (
                      <Tooltip label="No CRM contact for this Discord ID — they won't be imported. Create the contact first to include them next time.">
                        <Badge color="red">Not a CRM contact</Badge>
                      </Tooltip>
                    );
                  }
                  if (p.has_contact) {
                    if (p.already_on_event) {
                      stateBadge = (
                        <Tooltip label="This person is already on this event — submitting won't create a duplicate.">
                          <Badge color="yellow">Already on event</Badge>
                        </Tooltip>
                      );
                    } else {
                      stateBadge = (
                        <Tooltip label="Has a CRM contact and isn't on the event yet — will be added on submit.">
                          <Badge color="green">Valid</Badge>
                        </Tooltip>
                      );
                    }
                  }
                  return (
                    <Table.Tr
                      key={p.staged_participation_id}
                      c={!p.has_contact ? "dimmed" : undefined}
                    >
                      <Table.Td>{p.discord_name}</Table.Td>
                      <Table.Td>{p.discord_id}</Table.Td>
                      <Table.Td ta="center">
                        <ParticipationStatusBadge status={p.status} label={p.status} centered />
                      </Table.Td>
                      <Table.Td ta="center">{stateBadge}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}

        <Tooltip
          label="Nothing to import — none of the participants have a CRM contact."
          disabled={importableCount > 0 || !selectedStagedId}
        >
          <Button
            onClick={handleSubmit}
            disabled={!selectedStagedId || importableCount === 0 || submitting}
          >
            Submit
          </Button>
        </Tooltip>
      </Stack>
    </Modal>
  );
}

function EventViewContactTable({ event }: { event: Event }) {
  const currentParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusArray, setStatusArray] = useState<string[]>();
  const [opened, { open, close }] = useDisclosure(false);
  const [bulkOpened, { open: openBulk, close: closeBulk }] = useDisclosure(false);
  const [modalMode, setModalMode] = useState<"add" | "modify">("add");

  const pageNum = currentParams.get("page");
  const apiParams = new URLSearchParams();

  if (pageNum) apiParams.append("page", pageNum);
  if (searchQuery) apiParams.append("search", searchQuery);
  if (statusArray) {
    for (const status of statusArray) {
      apiParams.append("status", status);
    }
  }

  apiParams.append("event", event.id.toString());

  const {
    data,
    loading,
    refresh: refetch,
  } = useBackend<BackendPaginatedResults<EventParticipation>>(`/api/participants/?${apiParams}`);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const selectedData = data?.results.filter((participation) => selected.has(participation.id));
  const sortedParticipations = useMemo(() => {
    return [...(data?.results ?? [])].sort((a, b) => {
      const aInvalid = hasInvalidFinalAttendanceStatus(a.status);
      const bInvalid = hasInvalidFinalAttendanceStatus(b.status);

      if (aInvalid === bInvalid) return 0;
      return aInvalid ? -1 : 1;
    });
  }, [data?.results]);

  return (
    <>
      {opened && (
        <AddParticipantModal
          event={event}
          selected={modalMode === "add" ? undefined : selectedData}
          opened={opened}
          close={close}
          refresh={refetch}
          mode={modalMode}
        />
      )}
      {bulkOpened && (
        <BulkUploadModal
          opened={bulkOpened}
          close={closeBulk}
          refresh={refetch}
          eventId={event.id}
        />
      )}
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group grow align="flex-end">
            <TextInput
              label="Search"
              placeholder="Search by name, Discord ID, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <MultiSelect
              label="Participation Status"
              data={EVENT_PARTICIPATION_STATUSES}
              onChange={setStatusArray}
              value={statusArray}
            />
            {selected.size === 0 ? (
              <Group gap="xs" wrap="nowrap" grow>
                <Button
                  onClick={() => {
                    setModalMode("add");
                    open();
                  }}
                >
                  Add Participant
                </Button>
                <Button onClick={openBulk}>Bulk Upload</Button>
              </Group>
            ) : (
              <Button
                color="green"
                onClick={() => {
                  setModalMode("modify");
                  open();
                }}
              >
                Modify Selected
              </Button>
            )}
          </Group>
          {data && (
            <PaginatedTable
              title="Participants"
              showTitle={true}
              data={sortedParticipations}
              onRowClick={(ep: EventParticipation) => router.push(`/contacts/${ep.contact.id}`)}
              columns={["Name", "Contact", "Status"]}
              transforms={[
                (ep) => <Table.Td key={ep.contact.full_name}>{ep.contact.full_name}</Table.Td>,
                (ep) => (
                  <Table.Td key={ep.contact.phone}>
                    {formatContactInfo(ep.contact.full_name, ep.contact.phone)}
                  </Table.Td>
                ),
                (ep) => (
                  <Table.Td
                    key={ep.status}
                    style={{
                      whiteSpace: "nowrap",
                      width: "1%",
                    }}
                  >
                    <ParticipationStatusBadge status={ep.status} label={ep.status_display} />
                  </Table.Td>
                ),
              ]}
              loading={loading}
              useCheckboxes={true}
              onSelectionChange={setSelected}
              selected={selected}
              keyFn={(ep: EventParticipation) => ep.id}
              getRowBg={(ep: EventParticipation) =>
                hasInvalidFinalAttendanceStatus(ep.status)
                  ? "var(--mantine-color-red-light)"
                  : undefined
              }
            />
          )}
          {data && (
            <PaginationBar
              entityName="Participant(s)"
              totalCount={data?.count}
              previousUrl={data?.previous}
              nextUrl={data.next}
              handleNext={() =>
                data.next && updateParam("page", incrementPageSearchParam(currentParams))
              }
              handlePrevious={() =>
                data.previous && updateParam("page", decrementPageSearchParam(currentParams))
              }
            />
          )}
        </Stack>
      </Paper>
    </>
  );
}

function EventViewUsersTable({ event }: { event: Event }) {
  const currentParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);

  const pageNum = currentParams.get("page");
  const apiParams = new URLSearchParams();

  if (pageNum) apiParams.append("page", pageNum);
  if (searchQuery) apiParams.append("search", searchQuery);

  apiParams.append("event", event.id.toString());

  const {
    data,
    loading,
    refresh: refetch,
  } = useBackend<BackendPaginatedResults<UsersInEvent>>(`/api/assignments/?${apiParams}`);
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleDelete = async (userId: number) => {
    setDeletingId(userId);
    try {
      const response = await fetch(`/api/assignments/${userId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });
      if (response.ok) {
        refetch();
      } else if (response.status === 403) {
        notifications.show({
          title: "Permission Denied",
          message: "You do not have permission to remove this user from the event.",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to remove user. Please try again.",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to remove user. Please try again.",
        color: "red",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {addModalOpened && (
        <AddUserModal
          event={event}
          opened={addModalOpened}
          close={closeAddModal}
          refresh={refetch}
          currentUsers={data?.results ?? []}
        />
      )}
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group grow align="flex-end">
            <TextInput
              label="Search"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
            <Button onClick={openAddModal}>Add User</Button>
          </Group>
          {data && (
            <PaginatedTable
              title="Users"
              showTitle={true}
              data={data.results}
              columns={["Username", "Joined At"]}
              selected={new Set()}
              transforms={[
                (user: UsersInEvent) => (
                  <Table.Td key={user.user_username}>{user.user_username}</Table.Td>
                ),
                (user: UsersInEvent) => (
                  <Table.Td key={user.joined_at}>
                    {formatBackendProvidedDateTime(user.joined_at)}
                  </Table.Td>
                ),
                (user: UsersInEvent) => (
                  <Table.Td key={user.id}>
                    <Button
                      color="red"
                      size="xs"
                      loading={deletingId === user.id}
                      onClick={() => handleDelete(user.id)}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                ),
              ]}
              loading={loading}
              keyFn={(user: UsersInEvent) => user.id}
            />
          )}
          {data && (
            <PaginationBar
              entityName="User(s)"
              totalCount={data?.count}
              previousUrl={data?.previous}
              nextUrl={data.next}
              handleNext={() =>
                data.next && updateParam("page", incrementPageSearchParam(currentParams))
              }
              handlePrevious={() =>
                data.previous && updateParam("page", decrementPageSearchParam(currentParams))
              }
            />
          )}
        </Stack>
      </Paper>
    </>
  );
}

function AddUserModal({
  event,
  opened,
  close,
  refresh,
  currentUsers,
}: {
  event: Event;
  opened: boolean;
  close: () => void;
  refresh: () => void;
  currentUsers: UsersInEvent[];
}) {
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<User>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const apiParams = new URLSearchParams();
  if (userSearchQuery) apiParams.append("search", userSearchQuery);

  const usersSearch = useBackend<BackendPaginatedResults<User>>(`/api/users/?${apiParams}`);
  const { mutate: addMutate } = useBackendMutation(`/api/assignments/`, {
    method: "POST",
  });

  const currentUserIds = new Set(currentUsers.map((u) => u.user));

  const availableUsers = usersSearch.data?.results.filter((u) => !currentUserIds.has(u.id)) ?? [];
  const combobox = useCombobox();

  const removeUser = (u: User) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.delete(u);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await Promise.all(
        Array.from(selectedUsers).map((u) =>
          addMutate({
            event: event.id,
            user: u.id,
          })
        )
      );
      setSelectedUsers(new Set());
      close();
      refresh();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("403")) {
        notifications.show({
          title: "Permission Denied",
          message: "You do not have permission to add users to this event.",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to add users. Please try again.",
          color: "red",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Add User">
      <LoadingOverlay visible={submitting} />
      <Stack>
        <Combobox
          store={combobox}
          onOptionSubmit={(value) => {
            const user = availableUsers.find((u) => u.id.toString() === value);
            if (!user) return;

            setSelectedUsers((prev) => {
              const next = new Set(prev);
              next.add(user);
              return next;
            });
            setUserSearchQuery("");
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <TextInput
              label="User"
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={(event) => {
                setUserSearchQuery(event.currentTarget.value);
                combobox.openDropdown();
              }}
              onFocus={() => combobox.openDropdown()}
              onClick={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
              rightSection={usersSearch.loading ? <LoadingOverlay visible /> : null}
            />
          </Combobox.Target>

          <Combobox.Dropdown hidden={availableUsers.length === 0}>
            <Combobox.Options>
              {availableUsers.map((user) => (
                <Combobox.Option key={user.id} value={user.id.toString()}>
                  {user.username}
                </Combobox.Option>
              ))}

              {availableUsers.length === 0 && <Combobox.Empty>No users found</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <PaginatedTable
          columns={["Username", "Email"]}
          data={Array.from(selectedUsers)}
          transforms={[
            (u: User) => <Table.Td key="username">{u.username}</Table.Td>,
            (u: User) => <Table.Td key="email">{u.email}</Table.Td>,
            (u: User) => (
              <Table.Td key="actions">
                <Button color="red" onClick={() => removeUser(u)}>
                  Remove
                </Button>
              </Table.Td>
            ),
          ]}
          loading={false}
          noDataText="Select a user to proceed"
        />
        <Button onClick={handleSubmit} disabled={selectedUsers.size === 0}>
          Submit
        </Button>
      </Stack>
    </Modal>
  );
}
