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

type User = {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  email_addresses?: {
    email: string;
    primary: boolean;
    verified: boolean;
  }[];
  socialaccounts?: {
    provider: string;
    uid: string;
  }[];
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = async () => {
    setError(null);
    const res = await fetch("/api/auth/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie('csrftoken'),
      },
      credentials: "include",
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) setError("Failed to update profile");
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
        <Button onClick={updateProfile}>Save profile</Button>

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
