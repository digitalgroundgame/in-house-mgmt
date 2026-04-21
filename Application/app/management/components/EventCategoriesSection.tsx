import {
  Paper,
  Stack,
  Table,
  Group,
  Button,
  Text,
  TextInput,
  Textarea,
  ActionIcon,
  Modal,
} from "@mantine/core";
import { IconPlus, IconEdit } from "@tabler/icons-react";
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

  return (
    <>
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="flex-end">
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} size="xs">
              Add Event Category
            </Button>
          </Group>

          {loading ? (
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          ) : categories.length === 0 ? (
            <Text size="sm" c="dimmed">
              No event categories configured. Create one to get started.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Edit</Table.Th>
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
                      <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(category)}>
                        <IconEdit size={16} />
                      </ActionIcon>
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
        title={editingCategory ? "Edit Event Category" : "Create Event Category"}
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
              {editingCategory ? "Save Changes" : "Create Event Category"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
