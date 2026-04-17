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
  is_superuser?: boolean;
  is_active: boolean;
}

export interface Group {
  id: number;
  name: string;
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
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
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
    setSavingUserId(userId);
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
    } finally {
      setSavingUserId(null);
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
            <Table.Th>Groups</Table.Th>
            <Table.Th style={{ width: 80 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
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
                        loading={savingUserId === user.id}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => setEditingUser(null)}
                        disabled={savingUserId === user.id}
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
    </Stack>
  );
}
