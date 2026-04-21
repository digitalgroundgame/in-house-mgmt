"use client";

import {
  Container,
  Title,
  Stack,
  Paper,
  Group,
  Button,
  Divider,
  Collapse,
  ActionIcon,
  Alert,
} from "@mantine/core";
import {
  IconSettings,
  IconChevronDown,
  IconChevronUp,
  IconBrandDiscord,
  IconRefresh,
  IconTicket,
  IconUsers,
  IconCategory2,
} from "@tabler/icons-react";
import { useState } from "react";
import { apiClient } from "@/app/lib/apiClient";
import PlaceholderSection from "@/app/components/PlaceholderSection";
import TicketTemplatesSection from "@/app/components/TicketTemplatesSection";
import UsersSection from "@/app/components/management/UsersSection";
import EventCategoriesSection from "@/app/management/components/EventCategoriesSection";

export default function ManagementConsole() {
  const [discordSectionOpen, setDiscordSectionOpen] = useState(false);
  const [configSectionOpen, setConfigSectionOpen] = useState(false);
  const [templatesSectionOpen, setTemplatesSectionOpen] = useState(false);
  const [eventTypesSectionOpen, setEventTypesSectionOpen] = useState(false);
  const [usersSectionOpen, setUsersSectionOpen] = useState(true);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSyncMembership = async () => {
    setSyncLoading(true);
    setSyncResult(null);

    try {
      const data = await apiClient.post<{
        members_fetched: number;
        roles_fetched: number;
        contacts: { created: number; updated: number };
        membership_tags: { added: number; removed: number };
        role_tags: { added: number; removed: number };
      }>("/discord/sync-membership/", {});

      setSyncResult({
        type: "success",
        message: `Retrieved ${data.members_fetched} members (${data.roles_fetched} roles), created ${data.contacts.created} new contacts, updated ${data.contacts.updated} — membership tags: ${data.membership_tags.added} added, ${data.membership_tags.removed} removed; role tags: ${data.role_tags.added} added, ${data.role_tags.removed} removed.`,
      });
    } catch {
      setSyncResult({
        type: "error",
        message: "Failed to sync membership.",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const callTypes = [
    { value: "asset", label: "Asset" },
    { value: "sof_dev", label: "Software Development" },
    { value: "ally-reach", label: "Ally Reach" },
  ];

  const callStatuses = [
    { value: "0", label: "Open" },
    { value: "1", label: "To Do" },
    { value: "2", label: "In Progress" },
    { value: "3", label: "Blocked" },
    { value: "4", label: "Completed" },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={2}>Admin Management Console</Title>
          <p style={{ color: "gray", marginTop: "4px" }}>Manage system settings</p>
        </div>

        <Divider />

        {/* Users Management */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setUsersSectionOpen(!usersSectionOpen)}
            >
              <IconUsers size={24} />
              <Title order={3}>Users</Title>
              <ActionIcon variant="subtle">
                {usersSectionOpen ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </ActionIcon>
            </Group>

            <Collapse in={usersSectionOpen}>
              <UsersSection />
            </Collapse>
          </Stack>
        </Paper>

        {/* Discord Integration */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setDiscordSectionOpen(!discordSectionOpen)}
            >
              <IconBrandDiscord size={24} />
              <Title order={3}>Discord Integration</Title>
              <ActionIcon variant="subtle">
                {discordSectionOpen ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </ActionIcon>
            </Group>

            <Collapse in={discordSectionOpen}>
              <Stack gap="md">
                <p style={{ color: "gray", fontSize: "0.9rem" }}>
                  Sync Discord guild membership and roles with contact tags. This fetches all
                  members and roles from the Discord server, creates tags for Discord roles, and
                  updates membership/role tags on matching contacts.
                </p>

                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleSyncMembership}
                  loading={syncLoading}
                >
                  Sync Membership Tags
                </Button>

                {syncResult && (
                  <Alert
                    color={syncResult.type === "success" ? "green" : "red"}
                    withCloseButton
                    onClose={() => setSyncResult(null)}
                  >
                    {syncResult.message}
                  </Alert>
                )}
              </Stack>
            </Collapse>
          </Stack>
        </Paper>

        {/* Ticket Templates */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setTemplatesSectionOpen(!templatesSectionOpen)}
            >
              <IconTicket size={24} />
              <Title order={3}>Ticket Templates</Title>
              <ActionIcon variant="subtle">
                {templatesSectionOpen ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </ActionIcon>
            </Group>

            <Collapse in={templatesSectionOpen}>
              <TicketTemplatesSection />
            </Collapse>
          </Stack>
        </Paper>

        {/* Event Categories */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setEventTypesSectionOpen(!eventTypesSectionOpen)}
            >
              <IconCategory2 size={24} />
              <Title order={3}>Event Categories</Title>
              <ActionIcon variant="subtle">
                {eventTypesSectionOpen ? (
                  <IconChevronUp size={20} />
                ) : (
                  <IconChevronDown size={20} />
                )}
              </ActionIcon>
            </Group>

            <Collapse in={eventTypesSectionOpen}>
              <EventCategoriesSection />
            </Collapse>
          </Stack>
        </Paper>

        {/* System Configuration */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => setConfigSectionOpen(!configSectionOpen)}
            >
              <IconSettings size={24} />
              <Title order={3}>System Configuration</Title>
              <ActionIcon variant="subtle">
                {configSectionOpen ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </ActionIcon>
            </Group>

            <Collapse in={configSectionOpen}>
              <Stack gap="lg">
                <PlaceholderSection title="Call Types" items={callTypes} />
                <PlaceholderSection title="Call Statuses" items={callStatuses} />
              </Stack>
            </Collapse>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
