"use client";

import {
  Title,
  Paper,
  Stack,
  TextInput,
  Button,
  Divider,
  Text,
  Group,
  Badge,
  LoadingOverlay,
  Notification,
  Select,
} from "@mantine/core";
import { useState, useMemo } from "react";
import { apiClient } from "@/app/lib/apiClient";
import { loginWithProvider } from "@/app/utils/oauth";
import { useUser, User } from "@/app/components/provider/UserContext";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import { getTimezoneList, getBrowserTimezone } from "@/app/utils/datetime";

interface ProfileFormProps {
  user: User;
  refresh: () => void;
}

function ProfileForm({ user, refresh }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const { timezone, setTimezone, isLoading: timezoneLoading } = useTimezone();
  const timezoneList = useMemo(() => getTimezoneList(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);

  const updateProfile = async () => {
    setError(null);
    try {
      await apiClient.patch("/auth/user", { first_name: firstName, last_name: lastName });
    } catch {
      setError("Failed to update profile");
    }
    refresh();
  };

  return (
    <Paper p="lg" radius="md" withBorder style={{ maxWidth: 600, margin: "auto" }}>
      <Stack gap="lg">
        <Title order={2}>Account Settings for {user.username}</Title>
        {error && <Notification color="red">{error}</Notification>}

        {/* Profile */}
        <Divider label="Profile" />
        <TextInput
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
        />
        <TextInput
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
        />
        <Button
          onClick={updateProfile}
          disabled={firstName === user.first_name && lastName === user.last_name}
        >
          Save profile
        </Button>

        {/* Timezone Preferences */}
        <Divider label="Timezone Preferences" />
        <Select
          label="Display timezone"
          description={`Your browser detected: ${browserTimezone}`}
          placeholder="Select timezone"
          data={timezoneList}
          value={timezone}
          onChange={(value) => value && setTimezone(value)}
          searchable
          nothingFoundMessage="No timezone found"
          disabled={timezoneLoading}
        />

        {/* Emails */}
        <Divider label="Emails" />
        <Stack gap="xs">
          {user.email_addresses?.map((email) => (
            <Group key={email.email}>
              <Text>
                {email.email}{" "}
                {email.primary && (
                  <Badge color="green" component="span">
                    Primary
                  </Badge>
                )}{" "}
                {!email.verified && (
                  <Badge color="yellow" component="span">
                    Unverified
                  </Badge>
                )}
              </Text>
            </Group>
          ))}
        </Stack>

        {/* Groups */}
        <Divider label="Auth Groups" />
        <Group gap="xs">
          {user.groups?.length ? (
            user.groups.map((group) => (
              <Badge key={group} color={group === "ADMIN" ? "red" : "blue"} variant="light">
                {group}
              </Badge>
            ))
          ) : (
            <Text color="dimmed" size="sm">
              No group memberships
            </Text>
          )}
        </Group>

        {/* OAuth connections */}
        <Divider label="Connected accounts / OAuth" />
        <Stack gap="sm">
          {user.social_accounts?.map((acct) => (
            <Group key={acct.provider}>
              <Text>{acct.provider}</Text>
              <Button
                size="xs"
                color="red"
                variant="outline"
                onClick={async () => {
                  try {
                    await apiClient.delete(`/auth/social/connections/${acct.provider}/`);
                    window.location.reload();
                  } catch {
                    setError("Failed to remove connection");
                  }
                }}
              >
                Disconnect
              </Button>
            </Group>
          ))}
          <Group>
            {/* <Button onClick={() => loginWithProvider("google")}>Connect Google</Button> */}
            <Button onClick={() => loginWithProvider("discord")}>Connect Discord</Button>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function ProfilePage() {
  const { user, loading, refresh } = useUser();

  if (loading || !user) {
    return (
      <Paper p="lg" radius="md" withBorder style={{ maxWidth: 600, margin: "auto" }}>
        <LoadingOverlay visible={true} />
      </Paper>
    );
  }

  return <ProfileForm user={user} refresh={refresh} />;
}
