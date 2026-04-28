import {
  Modal,
  Select,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Tabs,
  Code,
  Badge,
} from "@mantine/core";
import { useState, useEffect, useMemo } from "react";
import { notifications } from "@mantine/notifications";
import { apiClient } from "@/app/lib/apiClient";
import { type TicketTemplate } from "@/app/components/tickets/ticket-utils";
import { SearchSelect, SearchSelectOption } from "@/app/components/SearchSelect";

interface Event {
  id: number;
  name: string;
  description: string;
  location_name: string;
  location_address: string;
  location_display: string;
  starts_at: string;
  ends_at: string;
  event_status: string;
}

interface Contact {
  id: number;
  full_name: string;
  discord_id: string;
  email: string;
  phone: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  contactIds: number[];
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: "0", label: "P0 – Emergency" },
  { value: "1", label: "P1 – Very High" },
  { value: "2", label: "P2 – High" },
  { value: "3", label: "P3 – Normal" },
  { value: "4", label: "P4 – Low" },
  { value: "5", label: "P5 – Very Low" },
];

function renderTemplate(
  templateStr: string,
  context: Record<string, Record<string, string>>
): string {
  if (!templateStr) return "";
  let result = templateStr;
  for (const [key, values] of Object.entries(context)) {
    for (const [field, value] of Object.entries(values)) {
      const regex = new RegExp(`{{\\s*${key}\\.${field}\\s*}}`, "g");
      result = result.replace(regex, value);
    }
  }
  return result;
}

async function fetchContact(id: number): Promise<Contact | null> {
  try {
    return await apiClient.get(`/contacts/${id}/`);
  } catch {
    return null;
  }
}

async function fetchEvent(id: number): Promise<Event | null> {
  try {
    return await apiClient.get(`/events/${id}/`);
  } catch {
    return null;
  }
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  UNKNOWN: "Unknown",
  INTRODUCTION: "Introduction",
  RECRUIT: "Recruit for event",
  CONFIRM: "Confirm event participation",
};

export function TicketBulkCreateModal({ opened, onClose, contactIds, onSuccess }: Props) {
  useEffect(() => {
    if (opened) {
      setTitle("");
      setDescription("");
      setSelectedTemplate(null);
      setTicketType(null);
      setPriority(null);
      setEvent(null);
      setAssignedToId(null);
    }
  }, [opened]);

  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null);
  const [ticketType, setTicketType] = useState<string | null>(null);
  const [ticketTypeOverridden, setTicketTypeOverridden] = useState(false);
  const [priority, setPriority] = useState<string | null>(null);
  const [priorityOverridden, setPriorityOverridden] = useState(false);
  const [event, setEvent] = useState<SearchSelectOption<Event> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("template");

  useEffect(() => {
    if (!selectedTemplate) return;
    setTitle(selectedTemplate.title_template);
    setDescription(selectedTemplate.description_template);
    if (!priorityOverridden) {
      setPriority(String(selectedTemplate.default_priority));
    }
    if (!ticketTypeOverridden) {
      setTicketType(selectedTemplate.ticket_type);
    }
  }, [selectedTemplate, priorityOverridden, ticketTypeOverridden]);

  const [previewContextData, setPreviewContextData] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    const fetchContext = async () => {
      const ctx: Record<string, Record<string, string>> = {};
      if (contactIds.length > 0) {
        const contact = await fetchContact(contactIds[0]);
        if (contact) {
          ctx.contact = {
            id: String(contact.id),
            full_name: contact.full_name || "",
            discord_id: contact.discord_id || "",
            email: contact.email || "",
            phone: contact.phone || "",
            display_name: contact.full_name || contact.discord_id || String(contact.id),
          };
        }
      }
      if (event) {
        const ev = await fetchEvent(Number(event.id));
        if (ev) {
          ctx.event = {
            id: String(ev.id),
            name: ev.name || "",
            display_name: ev.name || "",
            description: ev.description || "",
            location_name: ev.location_name || "",
            location_address: ev.location_address || "",
            location_display: ev.location_display || "",
            starts_at: ev.starts_at || "",
            ends_at: ev.ends_at || "",
            status: ev.event_status || "",
          };
        }
      }
      setPreviewContextData(ctx);
    };
    fetchContext();
  }, [contactIds, event]);

  const previewTitle = useMemo(
    () => renderTemplate(title, previewContextData),
    [title, previewContextData]
  );
  const previewDescription = useMemo(
    () => renderTemplate(description, previewContextData),
    [description, previewContextData]
  );

  const handleTemplateChange = (opt: SearchSelectOption<TicketTemplate> | null) => {
    const template = opt?.raw ?? null;
    setSelectedTemplate(template);
    if (template) {
      setTitle(template.title_template);
      setDescription(template.description_template);
      setPriority(String(template.default_priority));
      setPriorityOverridden(false);
      setTicketType(template.ticket_type);
      setTicketTypeOverridden(false);
    } else {
      setTicketType(null);
      setTicketTypeOverridden(false);
      setPriority(null);
      setPriorityOverridden(false);
    }
  };

  const handleTicketTypeChange = (value: string | null) => {
    setTicketType(value);
    setTicketTypeOverridden(true);
  };

  const handlePriorityChange = (value: string | null) => {
    setPriority(value);
    setPriorityOverridden(true);
  };

  const submit = async () => {
    // Check for missing required links
    const warnings: string[] = [];
    if (selectedTemplate?.requires_contact && contactIds.length === 0) {
      warnings.push("This template requires a contact, but no contacts were selected.");
    }
    if (selectedTemplate?.requires_event && !event) {
      warnings.push("This template requires an event, but none was selected.");
    }

    if (warnings.length > 0) {
      const proceed = confirm(
        warnings.join("\n\n") + "\n\nAre you sure you want to create these tickets?"
      );
      if (!proceed) return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      contact_ids: contactIds.map(Number),
      ticket_status: "OPEN",
      title,
      description,
      ticket_type: ticketType || "UNKNOWN",
    };

    if (selectedTemplate) {
      payload.template_id = selectedTemplate.id;
    }
    if (event) payload.event_id = Number(event.id);
    if (assignedToId) payload.assigned_to_id = Number(assignedToId);
    if (priority !== null) payload.priority = Number(priority);

    try {
      await apiClient.post("/tickets/bulk/", payload);
      const count = contactIds.length;
      notifications.show({
        title: "Success",
        message: `Successfully created ${count} ticket${count === 1 ? "" : "s"}!`,
        color: "green",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Unknown error",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Bulk Create Tickets" size="xl" centered>
      <Stack gap="md">
        <Group grow>
          {/* Template */}
          <SearchSelect<TicketTemplate>
            endpoint="/api/ticket-templates/"
            label="Template"
            placeholder="Select template"
            limit={10}
            value={
              selectedTemplate
                ? { id: selectedTemplate.id, label: selectedTemplate.name, raw: selectedTemplate }
                : null
            }
            onChange={handleTemplateChange}
            clearable
            mapResult={(tpl) => ({
              id: tpl.id,
              label: tpl.name,
              raw: tpl,
            })}
          />

          {/* Event */}
          <SearchSelect<Event>
            endpoint="/api/events/"
            label="Event"
            placeholder="Search events"
            limit={5}
            value={event}
            onChange={setEvent}
            clearable
            mapResult={(ev) => ({
              id: ev.id,
              label: `${ev.name} (id: ${ev.id})`,
              raw: ev,
            })}
          />
        </Group>

        <Group grow>
          {/* Ticket Type */}
          <Select
            label="Ticket Type"
            placeholder={
              selectedTemplate
                ? `${TICKET_TYPE_LABELS[selectedTemplate.ticket_type] || selectedTemplate.ticket_type} (DEFAULT)`
                : "Select ticket type"
            }
            data={Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            value={ticketType}
            onChange={handleTicketTypeChange}
            clearable
          />

          {/* Priority */}
          <Select
            label="Priority"
            placeholder={
              selectedTemplate
                ? `${PRIORITY_OPTIONS.find((p) => p.value === String(selectedTemplate.default_priority))?.label} (DEFAULT)`
                : "Select priority"
            }
            data={PRIORITY_OPTIONS}
            value={priority}
            onChange={handlePriorityChange}
            clearable
            disabled={!selectedTemplate}
          />
        </Group>

        {/* Template/Preview Tabs */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Tabs.List>
            <Tabs.Tab value="template">Template</Tabs.Tab>
            <Tabs.Tab value="preview">
              Preview
              {contactIds.length > 0 && (
                <Badge size="xs" ml={4}>
                  {contactIds.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel
            value="template"
            pt="sm"
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <Stack gap="sm" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <TextInput
                label="Title Template"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                placeholder="{{contact.display_name}} - Intro"
              />
              <Textarea
                label="Description Template"
                minRows={8}
                autosize
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                placeholder="Hi {{contact.discord_id}}, ..."
                style={{ flex: 1, minHeight: 200 }}
              />
              <Text size="xs" c="dimmed">
                Use <Code ff="monospace">{"{{contact.field}}"}</Code> or{" "}
                <Code ff="monospace">{"{{event.field}}"}</Code> to insert dynamic values.
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel
            value="preview"
            pt="sm"
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <Stack gap="sm" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <TextInput label="Rendered Title" value={previewTitle} readOnly variant="filled" />
              <Textarea
                label="Rendered Description"
                minRows={10}
                autosize
                value={previewDescription}
                readOnly
                variant="filled"
                style={{ flex: 1, minHeight: 200 }}
              />
              {contactIds.length > 1 && (
                <Text size="xs" c="dimmed">
                  Preview shows first contact ({contactIds.length} total)
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Footer */}
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            {contactIds.length === 0
              ? "No tickets will be created"
              : `${contactIds.length} ticket${contactIds.length !== 1 ? "s" : ""} will be created`}
          </Text>

          <Group>
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submit} loading={loading} disabled={contactIds.length === 0}>
              Create Tickets
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
