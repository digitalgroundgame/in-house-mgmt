"use client";

import {
  Stack,
  Group,
  Text,
  Button,
  Table,
  ActionIcon,
  Menu,
  Loader,
  Alert,
  Box,
  MultiSelect,
  Tooltip,
  TextInput,
  Pagination,
  Modal,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconDotsVertical,
  IconBan,
  IconCheck,
  IconSearch,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { GroupBadge } from "@/app/components/GroupBadge";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/app/lib/apiClient";
import AddUserModal from "./AddUserModal";

export interface ManagedUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  groups: string[];
  primary_email: string;
  discord_ids: { id: number; discord_id: string; active: boolean }[];
  is_superuser?: boolean;
  is_active: boolean;
}

export interface Group {
  id: number;
  name: string;
}

export interface DiscordID {
  id: number;
  user: number;
  discord_id: string;
  active: boolean;
}

interface PaginatedResponse {
  count: number;
  results: ManagedUser[];
  page: number;
  page_size: number;
}

interface Props {
  onUserCreated?: () => void;
}

const PAGE_SIZE = 10;

export default function UsersSection({ onUserCreated }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editingDiscordIdUserId, setEditingDiscordIdUserId] = useState<number | null>(null);
  const [editingEmailUserId, setEditingEmailUserId] = useState<number | null>(null);
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      const data = await apiClient.get<PaginatedResponse>(`/management/users/?${params}`);
      setUsers(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await apiClient.get<Group[]>("/management/groups/");
      setGroups(data);
    } catch {
      // Groups fetch failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleUserCreated = () => {
    fetchUsers();
    onUserCreated?.();
  };

  const handleEditGroups = (user: ManagedUser) => {
    setEditingUser(user);
  };

  const handleSaveGroups = async (userId: number, newGroups: string[]) => {
    try {
      await apiClient.patch(`/management/users/${userId}/`, { groups: newGroups });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, groups: newGroups } : u)));
      setEditingUser(null);
      notifications.show({
        title: "Success",
        message: "Group memberships updated",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update groups",
        color: "red",
      });
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      const result = await apiClient.post<{ is_active: boolean }>(
        `/management/users/${user.id}/toggle-active/`,
        {}
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: result.is_active } : u))
      );
      notifications.show({
        title: "Success",
        message: result.is_active
          ? `${user.username} has been enabled`
          : `${user.username} has been disabled`,
        color: result.is_active ? "green" : "orange",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update user status",
        color: "red",
      });
    }
  };

  const handleSaveDiscordId = async (userId: number) => {
    const existingDiscordId = users.find((u) => u.id === userId)?.discord_ids?.[0];
    try {
      // NewDiscord ID being set
      if (newDiscordId.trim()) {
        // Update Discord ID
        if (existingDiscordId) {
          await apiClient.patch(`/management/discord-ids/${existingDiscordId.id}/`, {
            discord_id: newDiscordId.trim(),
            active: true,
          });
        } else {
          // Create Discord ID
          await apiClient.post("/management/discord-ids/", {
            user: userId,
            discord_id: newDiscordId.trim(),
            active: true,
          });
        }
      } else if (existingDiscordId) {
        // Existing discord ID, but no new discord ID, therefore we are removing it
        await apiClient.delete(`/management/discord-ids/${existingDiscordId.id}/`);
      }
      setEditingDiscordIdUserId(null);
      fetchUsers();
      notifications.show({
        title: "Success",
        message: "Discord ID updated",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update Discord ID",
        color: "red",
      });
    }
  };

  const handleSaveEmail = async (userId: number) => {
    try {
      await apiClient.patch(`/management/users/${userId}/`, {
        email: newEmail.trim() || null,
      });
      setEditingEmailUserId(null);
      fetchUsers();
      notifications.show({
        title: "Success",
        message: "Email updated",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update email",
        color: "red",
      });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && users.length === 0) {
    return (
      <Box py="xl" style={{ textAlign: "center" }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Search users..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ width: 250 }}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpen(true)}>
          Add User
        </Button>
      </Group>

      {error && (
        <Alert color="red" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Table striped highlightOnHover data-testid="users-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Username</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Discord IDs</Table.Th>
            <Table.Th>Groups</Table.Th>
            <Table.Th style={{ width: 80 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  {searchQuery ? "No users match your search" : "No users found"}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            users.map((user) => (
              <Table.Tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.5 }}>
                <Table.Td>
                  <Group gap={4}>
                    {!user.is_active && (
                      <Tooltip label="User is disabled">
                        <IconBan size={14} color="gray" />
                      </Tooltip>
                    )}
                    <Text fw={500}>{user.username}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text>
                    {user.first_name} {user.last_name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {user.primary_email || "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {user.discord_ids && user.discord_ids.length > 0 ? (
                    <Text
                      size="sm"
                      c={user.discord_ids[0].active ? "blue" : "gray"}
                      style={{ opacity: user.discord_ids[0].active ? 1 : 0.5 }}
                    >
                      {user.discord_ids[0].discord_id}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {editingUser?.id === user.id ? (
                    <Group gap={4}>
                      <MultiSelect
                        size="xs"
                        placeholder="Select groups"
                        data={groups.map((g) => ({ value: g.name, label: g.name }))}
                        value={editingUser.groups}
                        onChange={(value) => {
                          setEditingUser({
                            ...editingUser,
                            groups: value,
                          });
                        }}
                        clearable
                        style={{ minWidth: 180 }}
                      />
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleSaveGroups(user.id, editingUser.groups)}
                        loading={loading}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => setEditingUser(null)}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </Group>
                  ) : (
                    <Group gap={4}>
                      {user.is_superuser && <GroupBadge group="ADMIN" />}
                      {user.groups.length === 0
                        ? !user.is_superuser && (
                            <Text size="sm" c="dimmed">
                              No group
                            </Text>
                          )
                        : user.groups.map((group) => <GroupBadge key={group} group={group} />)}
                    </Group>
                  )}
                </Table.Td>
                <Table.Td>
                  <Menu shadow="sm" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm">
                        <IconDotsVertical size={14} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleEditGroups(user)}
                        disabled={editingUser?.id === user.id}
                      >
                        Edit Groups
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => {
                          setEditingEmailUserId(user.id);
                          setNewEmail(user.primary_email || "");
                        }}
                      >
                        Edit Email
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => {
                          setEditingDiscordIdUserId(user.id);
                          setNewDiscordId(user.discord_ids?.[0]?.discord_id || "");
                        }}
                      >
                        Edit Discord ID
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          user.is_active ? <IconBan size={14} /> : <IconCheck size={14} />
                        }
                        onClick={() => handleToggleActive(user)}
                        color={user.is_active ? "red" : "green"}
                      >
                        {user.is_active ? "Disable User" : "Enable User"}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {totalCount} user{totalCount !== 1 ? "s" : ""} total
          </Text>
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}

      <AddUserModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleUserCreated}
        groups={groups}
      />

      <Modal
        opened={editingEmailUserId !== null}
        onClose={() => setEditingEmailUserId(null)}
        title="Edit Email"
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="Enter email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditingEmailUserId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingEmailUserId) {
                  handleSaveEmail(editingEmailUserId);
                }
              }}
              loading={loading}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editingDiscordIdUserId !== null}
        onClose={() => setEditingDiscordIdUserId(null)}
        title="Edit Discord ID"
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Discord ID"
            placeholder="Enter Discord ID"
            value={newDiscordId}
            onChange={(e) => setNewDiscordId(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditingDiscordIdUserId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingDiscordIdUserId) {
                  handleSaveDiscordId(editingDiscordIdUserId);
                }
              }}
              loading={loading}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
