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
  ActionIcon,
  Modal,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/apiClient";

interface EventCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
  modified_at: string;
}

export default function EventCategoriesSection() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ results: EventCategory[] }>("/event-categories/");
      setCategories(data.results || []);
    } catch (e) {
      console.error("Failed to load event categories", e);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (category: EventCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingCategory) {
        await apiClient.patch(`/event-categories/${editingCategory.id}/`, formData);
      } else {
        await apiClient.post("/event-categories/", formData);
      }
      setModalOpen(false);
      loadCategories();
    } catch (e) {
      console.error("Failed to save event category", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event type?")) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/event-categories/${id}/`);
      loadCategories();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("409")) {
        setDeleteError("Cannot delete an event type that is assigned to events.");
      } else {
        console.error("Failed to delete event category", e);
      }
    }
  };

  return (
    <>
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Event Types</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} size="xs">
              Add Event Type
            </Button>
          </Group>

          {deleteError && (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          )}

          {loading ? (
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          ) : categories.length === 0 ? (
            <Text size="sm" c="dimmed">
              No event types configured. Create one to get started.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Text size="sm">{category.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>
                        {category.description || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(category)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
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
        title={editingCategory ? "Edit Event Type" : "Create Event Type"}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingCategory ? "Save Changes" : "Create Event Type"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
