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
import { useEffect, useState } from "react";
import getCookie from '@/app/utils/cookie'
import { loginWithProvider } from '@/app/utils/oauth';
import { useUser } from '@/app/components/provider/UserContext';

export default function ProfilePage() {
  const { user, loading, refresh } = useUser();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      <LoadingOverlay visible={loading} />
      <Stack spacing="lg">
        <Title order={2}>Account Settings for {user?.username || "..."}</Title>
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
          disabled={!user || firstName === user.first_name && lastName === user.last_name}
        >
          Save profile
        </Button>

        {/* Emails */}
        <Divider label="Emails" />
        <Stack spacing="xs">
          {user?.email_addresses?.map((email) => (
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
        <Group spacing="xs">
          {user?.groups?.length ? (
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
        <Stack spacing="sm">
          {user?.social_accounts?.map((acct) => (
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
