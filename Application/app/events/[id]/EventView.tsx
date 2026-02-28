import { Contact } from "@/app/components/ContactSearch";
import PaginatedTable from "@/app/components/pagination/PaginatedTable";
import PaginationBar, {
  decrementPageSearchParam,
  incrementPageSearchParam,
} from "@/app/components/pagination/PaginationBar";
import { formatContactInfo } from "@/app/components/contact-utils";
import { Event, getStatusColor as getEventStatusColor } from "@/app/components/event-utils";
import { BackendPaginatedResults, useBackend } from "@/app/lib/api";
import { ApiError, apiClient } from "@/app/lib/apiClient";
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
  Textarea,
  Select,
  Group,
  MultiSelect,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface StatusOption {
  label: string;
  value: string;
}

function makeUnstyled(fontSize?: string, fontWeight?: string, forTextarea = false) {
  const base: Record<string, string | number> = {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    lineHeight: "inherit",
    fontSize: fontSize ?? "inherit",
    fontWeight: fontWeight ?? "inherit",
    fontFamily: "inherit",
    color: "inherit",
  };
  if (!forTextarea) {
    base.height = "auto";
    base.minHeight = "unset";
  }
  return { input: base };
}

function InlineEdit({
  value,
  onSave,
  type = "text",
  options,
  displayComponent,
  fontSize,
  fontWeight,
}: {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "textarea" | "select" | "datetime-local";
  options?: { label: string; value: string }[];
  displayComponent: React.ReactNode;
  fontSize?: string;
  fontWeight?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!editing) {
    return (
      <Box
        style={{ cursor: "pointer" }}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {displayComponent}
      </Box>
    );
  }

  if (type === "select") {
    return (
      <Select
        data={options}
        value={draft}
        onChange={(v) => {
          if (v !== null) {
            onSave(v);
          }
          setEditing(false);
        }}
        allowDeselect={false}
        defaultDropdownOpened
        onDropdownClose={() => setEditing(false)}
        size="xs"
      />
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
        minRows={1}
        autosize
        styles={makeUnstyled(fontSize, fontWeight, true)}
      />
    );
  }

  return (
    <TextInput
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      styles={makeUnstyled(fontSize, fontWeight)}
    />
  );
}

export default function EventView({
  event,
  refresh,
}: {
  event: Event | undefined;
  refresh: () => void;
}) {
  return (
    <Container py="xl" size="xl">
      <LoadingOverlay visible={!event} />
      {event && <EventViewMain event={event} refresh={refresh} />}
    </Container>
  );
}

function EventViewMain({ event, refresh }: { event: Event; refresh: () => void }) {
  const { data: eventStatuses } = useBackend<StatusOption[]>("/api/event-statuses/");

  const handleSave = async (field: string, value: string) => {
    try {
      await apiClient.patch(`/events/${event.id}/`, { [field]: value });
      refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        alert("User does not have permission to edit this event.");
      } else {
        alert("Failed to save changes.");
      }
    }
  };

  return (
    <Grid>
      <GridCol span={{ base: 12, md: 8 }}>
        <Paper withBorder p="md">
          <Stack gap="sm">
            <InlineEdit
              value={event.name}
              onSave={(v) => handleSave("name", v)}
              displayComponent={<Title>{event.name}</Title>}
              fontSize="var(--mantine-h1-font-size)"
              fontWeight="bold"
            />
            <Divider />
            <InlineEdit
              type="textarea"
              value={event.description ?? ""}
              onSave={(v) => handleSave("description", v)}
              displayComponent={<Text>{event.description || "No description"}</Text>}
            />
          </Stack>
        </Paper>
        <EventViewContactTable event={event} />
      </GridCol>
      <EventViewMetadata event={event} onSave={handleSave} statusOptions={eventStatuses} />
    </Grid>
  );
}

function EventViewMetadata({
  event,
  onSave,
  statusOptions,
}: {
  event: Event;
  onSave: (field: string, value: string) => void;
  statusOptions?: StatusOption[];
}) {
  return (
    <GridCol span={{ base: 12, md: 4 }}>
      <Paper withBorder p="sm">
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Event Status
          </Text>
          <InlineEdit
            type="select"
            value={event.event_status}
            options={statusOptions}
            onSave={(v) => onSave("event_status", v)}
            displayComponent={
              <Badge color={getEventStatusColor(event.status_display)}>
                {event.status_display}
              </Badge>
            }
          />
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Location Name
          </Text>
          <InlineEdit
            value={event.location_name ?? ""}
            onSave={(v) => onSave("location_name", v)}
            displayComponent={<Text>{event.location_name || "—"}</Text>}
          />
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Address
          </Text>
          <InlineEdit
            value={event.location_address ?? ""}
            onSave={(v) => onSave("location_address", v)}
            displayComponent={<Text>{event.location_address || "—"}</Text>}
          />
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            Start Date
          </Text>
          <InlineEdit
            type="datetime-local"
            value={event.starts_at ?? ""}
            onSave={(v) => onSave("starts_at", v)}
            displayComponent={<Text>{event.starts_at || "—"}</Text>}
          />
        </Box>
        <Divider />
        <Box mt={4} mb={4}>
          <Text c="dimmed" size="sm">
            End Date
          </Text>
          <InlineEdit
            type="datetime-local"
            value={event.ends_at ?? ""}
            onSave={(v) => onSave("ends_at", v)}
            displayComponent={<Text>{event.ends_at || "—"}</Text>}
          />
        </Box>
      </Paper>
    </GridCol>
  );
}

export interface EventParticipation {
  contact: Contact;
  created_at: string;
  modified_at: string;
  id: number;
  status: string;
  status_display: string;
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "UNKNOWN":
      return "gray";
    case "MAYBE":
      return "gray";
    case "COMMITTED":
      return "blue";
    case "REJECTED":
      return "red";
    case "ATTENDED":
      return "green";
    case "NO_SHOW":
      return "red";
    default:
      return "DimGray";
  }
};

function EventViewContactTable({ event }: { event: Event }) {
  const currentParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>();
  const [statusArray, setStatusArray] = useState<string[]>();
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

  const { data, loading, error } = useBackend<BackendPaginatedResults<EventParticipation>>(
    `/api/participants?${apiParams}`
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const router = useRouter();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(currentParams.toString());

    if (!value || value === "all") params.delete(key);
    else params.set(key, value);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <Paper p="md" mt="sm" withBorder style={{ position: "relative" }}>
        <Stack>
          <Group>
            <TextInput
              label="Search"
              placeholder="Search by name, Discord ID, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <MultiSelect
              label="Participation Status"
              data={["UNKNOWN", "MAYBE", "COMMITED", "REJECTED", "ATTENDED", "NO_SHOW"]}
              onChange={setStatusArray}
              value={statusArray}
              style={{ flex: 1 }}
            />
          </Group>
          {data && (
            <PaginatedTable
              title="Participants"
              showTitle={true}
              data={data.results}
              onRowClick={(contact: EventParticipation) => router.push(`/contacts/${contact.id}`)}
              columns={["Name", "Contact", "Status"]}
              transforms={[
                (ep) => <Table.Td key={ep.contact.full_name}>{ep.contact.full_name}</Table.Td>,
                (ep) => (
                  <Table.Td key={ep.contact.phone}>
                    {formatContactInfo(ep.contact.full_name, ep.contact.phone)}
                  </Table.Td>
                ),
                (ep) => (
                  <Table.Td key={ep.status}>
                    <Badge color={getStatusColor(ep.status)}>{ep.status_display}</Badge>
                  </Table.Td>
                ),
              ]}
              loading={loading}
              useCheckboxes={true}
              onSelectionChange={setSelected}
              selected={selected}
              keyFn={(ep: EventParticipation) => ep.id}
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
