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
} from "@tabler/icons-react";
import { useState } from "react";
import { apiClient } from "@/app/lib/apiClient";
import PlaceholderSection from "@/app/components/PlaceholderSection";

export default function ManagementConsole() {
  const [discordSectionOpen, setDiscordSectionOpen] = useState(false);
  const [configSectionOpen, setConfigSectionOpen] = useState(false);

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
        contacts_created: number;
        updated_contacts: number;
        tags_added: number;
        tags_removed: number;
      }>("/discord/sync-membership/", {});

      setSyncResult({
        type: "success",
        message: `Retrieved ${data.members_fetched} contacts, created ${data.contacts_created} new contacts, updated ${data.updated_contacts} — ${data.tags_added} tags added, ${data.tags_removed} removed.`,
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
                  Sync Discord guild membership with contact tags. This fetches all members from the
                  Discord server and updates the membership tag on matching contacts.
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
