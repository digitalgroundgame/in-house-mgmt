import {
  Stack,
  Title,
  Table,
  LoadingOverlay,
  Text,
  Badge,
  Group,
  Button,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";

export interface GroupMember {
  did: string;
  name: string;
  access_level: number; // 1=View, 2=Edit
  group: number;
  id?: number; // VolunteerInGroup ID for PATCH/DELETE
}

interface OrganizationMembersTableProps {
  members: GroupMember[];
  organizationName: string;
  loading?: boolean;
  onAddMember?: () => void;
  onEditMember?: (member: GroupMember) => void;
  onRemoveMember?: (member: GroupMember) => void;
}

const getGroupAccessColor = (level: number) => {
  return level === 2 ? "green" : "blue"; // Edit: green, View: blue
};

const getGroupAccessLabel = (level: number) => {
  return level === 2 ? "Edit" : "View";
};

export default function OrganizationMembersTable({
  members,
  organizationName,
  loading = false,
  onAddMember,
  onEditMember,
  onRemoveMember,
}: OrganizationMembersTableProps) {
  return (
    <Stack gap="md" style={{ position: "relative", minHeight: "300px" }}>
      <LoadingOverlay visible={loading} />

      <Group justify="space-between">
        <Title order={5}>Members of {organizationName}</Title>
        {onAddMember && (
          <Button leftSection={<IconPlus size={16} />} size="xs" onClick={onAddMember}>
            Add Member
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Discord ID</Table.Th>
            <Table.Th>Access Level</Table.Th>
            <Table.Th style={{ width: "100px" }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {members.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                <Text c="dimmed" py="xl">
                  This organization has no members.
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            members.map((member) => (
              <Table.Tr key={member.did}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {member.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {member.did}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm" color={getGroupAccessColor(member.access_level)}>
                    {getGroupAccessLabel(member.access_level)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {onEditMember && (
                      <Tooltip label="Edit access level">
                        <ActionIcon
                          color="blue"
                          variant="subtle"
                          onClick={() => onEditMember(member)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {onRemoveMember && (
                      <Tooltip label="Remove member">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => onRemoveMember(member)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
