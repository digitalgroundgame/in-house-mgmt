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
} from "@mantine/core";
import { useState } from "react";
import getCookie from '@/app/utils/cookie'
import { loginWithProvider } from '@/app/utils/oauth';
import { useUser, User } from '@/app/components/provider/UserContext';

interface ProfileFormProps {
  user: User;
  refresh: () => void;
}

function ProfileForm({ user, refresh }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');

  const updateProfile = async () => {
    setError(null);
    const res = await fetch("/api/auth/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie('csrftoken'),
      },
      credentials: "include",
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) setError("Failed to update profile");

    refresh()
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

        {/* Emails */}
        <Divider label="Emails" />
        <Stack gap="xs">
          {user.email_addresses?.map((email) => (
            <Group key={email.email} position="apart">
              <Text>
                {email.email}{" "}
                {email.primary && <Badge color="green" component="span">Primary</Badge>}{" "}
                {!email.verified && <Badge color="yellow" component="span">Unverified</Badge>}
              </Text>
            </Group>
          ))}
        </Stack>

        {/* Groups */}
        <Divider label="Auth Groups" />
        <Group gap="xs">
          {user.groups?.length ? (
            user.groups.map((group) => (
              <Badge key={group} color={group === "ADMIN"? "red": "blue"} variant="light">
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
            <Group key={acct.provider} position="apart">
              <Text>{acct.provider}</Text>
              <Button
                size="xs"
                color="red"
                variant="outline"
                onClick={async () => {
                  const res = await fetch(`/api/auth/social/connections/${acct.provider}/`, {
                    method: "DELETE",
                    headers: { "X-CSRFToken": getCookie('csrftoken') },
                    credentials: "include",
                  });
                  if (res.ok) window.location.reload();
                  else setError("Failed to remove connection");
                }}
              >
                Disconnect
              </Button>
            </Group>
          ))}
          <Group>
            <Button onClick={() => loginWithProvider("google")}>Connect Google</Button>
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
