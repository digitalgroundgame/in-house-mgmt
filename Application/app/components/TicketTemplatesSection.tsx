import {
  Paper,
  Stack,
  Title,
  Table,
  Group,
  Button,
  Text,
  TextInput,
  Textarea,
  Select,
  ActionIcon,
  Modal,
  NumberInput,
  Checkbox,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiClient";
import { type TicketTemplate } from "@/app/components/tickets/ticket-utils";

const TICKET_TYPE_OPTIONS = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "INTRODUCTION", label: "Introduction" },
  { value: "RECRUIT", label: "Recruit for event" },
  { value: "CONFIRM", label: "Confirm event participation" },
];

const PRIORITY_OPTIONS = [
  { value: "0", label: "P0 - Emergency (Do Now)" },
  { value: "1", label: "P1 - Very High" },
  { value: "2", label: "P2 - High" },
  { value: "3", label: "P3 - Normal" },
  { value: "4", label: "P4 - Low" },
  { value: "5", label: "P5 - Very Low" },
];

interface TicketTemplatesSectionProps {
  refreshKey?: number;
}

export default function TicketTemplatesSection({ refreshKey }: TicketTemplatesSectionProps) {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    ticket_type: "UNKNOWN",
    title_template: "",
    description_template: "",
    default_priority: 3,
    requires_contact: false,
    requires_event: false,
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ results: TicketTemplate[] }>("/ticket-templates/");
      setTemplates(data.results || []);
    } catch (e) {
      console.error("Failed to load templates", e);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [refreshKey]);

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      ticket_type: "UNKNOWN",
      title_template: "",
      description_template: "",
      default_priority: 3,
      requires_contact: false,
      requires_event: false,
    });
    setModalOpen(true);
  };

  const openEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      ticket_type: template.ticket_type,
      title_template: template.title_template,
      description_template: template.description_template,
      default_priority: template.default_priority,
      requires_contact: template.requires_contact,
      requires_event: template.requires_event,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await apiClient.patch(`/ticket-templates/${editingTemplate.id}/`, formData);
      } else {
        await apiClient.post("/ticket-templates/", formData);
      }
      setModalOpen(false);
      loadTemplates();
    } catch (e) {
      console.error("Failed to save template", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await apiClient.delete(`/ticket-templates/${id}/`);
      loadTemplates();
    } catch (e) {
      console.error("Failed to delete template", e);
    }
  };

  return (
    <>
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Ticket Templates</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} size="xs">
              Add Template
            </Button>
          </Group>

          {loading ? (
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          ) : templates.length === 0 ? (
            <Text size="sm" c="dimmed">
              No templates configured. Create one to get started.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {templates.map((template) => (
                  <Table.Tr key={template.id}>
                    <Table.Td>
                      <Text size="sm">{template.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {TICKET_TYPE_OPTIONS.find((t) => t.value === template.ticket_type)?.label ||
                          template.ticket_type}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {PRIORITY_OPTIONS.find(
                          (p) => String(p.value) === String(template.default_priority)
                        )?.label || `P${template.default_priority}`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(template)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? "Edit Template" : "Create Template"}
        size="xl"
        h="80vh"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Select
            label="Ticket Type"
            required
            data={TICKET_TYPE_OPTIONS}
            value={formData.ticket_type}
            onChange={(v) => setFormData({ ...formData, ticket_type: v || "UNKNOWN" })}
          />

          <NumberInput
            label="Default Priority"
            min={0}
            max={5}
            value={formData.default_priority}
            onChange={(v) => setFormData({ ...formData, default_priority: Number(v) || 3 })}
          />

          <Group grow>
            <Checkbox
              label="Requires Contact"
              description="Tickets from this template must have a contact"
              checked={formData.requires_contact}
              onChange={(e) =>
                setFormData({ ...formData, requires_contact: e.currentTarget.checked })
              }
            />
            <Checkbox
              label="Requires Event"
              description="Tickets from this template must have an event"
              checked={formData.requires_event}
              onChange={(e) =>
                setFormData({ ...formData, requires_event: e.currentTarget.checked })
              }
            />
          </Group>

          <TextInput
            label="Title Template"
            description="Use {{contact.field}} or {{event.field}} for dynamic values"
            value={formData.title_template}
            onChange={(e) => setFormData({ ...formData, title_template: e.currentTarget.value })}
          />

          <Textarea
            label="Description Template"
            description="Use {{contact.field}} or {{event.field}} for dynamic values"
            minRows={12}
            autosize
            value={formData.description_template}
            onChange={(e) =>
              setFormData({ ...formData, description_template: e.currentTarget.value })
            }
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
