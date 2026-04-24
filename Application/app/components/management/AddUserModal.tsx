"use client";

import { Modal, Stack, TextInput, Button, Group, MultiSelect } from "@mantine/core";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";
import formatApiPayload from "@/app/utils/format-api-payload";

interface Group {
  id: number;
  name: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  availableGroups: Group[];
}

type CreateUserPayload = {
  username: string;
  first_name?: string;
  last_name?: string;
  groups: string[];
} & ({ email: string; discord_id?: string } | { email?: string; discord_id: string });

interface Form {
  discordId: string;
  email: string;
  firstName: string;
  lastName: string;
  selectedGroups: string[];
  username: string;
}

export default function AddUserModal({ opened, onClose, onSuccess, availableGroups }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<Form>({
    initialValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      discordId: "",
      selectedGroups: [],
    },

    validate: {
      username: (value) => {
        if (!value.trim()) return "Username is required";
        if (value.trim().length < 3) return "Username must be at least 3 characters";
        return null;
      },
      email: (value) => {
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email address";
        return null;
      },
      discordId: (value, values) => {
        if (!value.trim() && !values.email.trim()) return "Discord ID or Email is required";
        return null;
      },
    },
  });

  useEffect(() => {
    if (opened) form.reset();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: Form) => {
    setLoading(true);
    const { email, username, firstName, lastName, discordId, selectedGroups } = values;

    const payload = formatApiPayload<CreateUserPayload>(
      {
        username: username,
        groups: selectedGroups,
        email: email,
        first_name: firstName,
        last_name: lastName,
        discord_id: discordId,
      },
      { trim: true, removeBlank: true }
    );

    try {
      await apiClient.post<{ id: number }>("/management/users/", payload);

      notifications.show({
        title: "Success",
        message: `User "${payload.username}" created successfully`,
        color: "green",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      let errorMessage = "Failed to create user";
      if (err instanceof Error) {
        if (err.message.includes("already exists")) {
          errorMessage = err.message;
        } else if (err.message.includes("403")) {
          errorMessage = "You do not have permission to create users.";
        } else {
          errorMessage = err.message;
        }
      }
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupOptions = availableGroups.map((g) => ({ value: g.name, label: g.name }));

  return (
    <Modal opened={opened} onClose={onClose} title="Add New User" size="md" centered>
      <Stack gap="md">
        <TextInput
          label="Username"
          placeholder="Enter username"
          required
          description="Used for login. Must be unique."
          {...form.getInputProps("username")}
        />

        <Stack gap="xs">
          <TextInput
            label="Discord ID"
            placeholder="123456789012345678"
            {...form.getInputProps("discordId")}
            description="Link a Discord account for OAuth login"
          />

          <TextInput
            label="Email"
            placeholder="user@example.com"
            {...form.getInputProps("email")}
          />
        </Stack>

        <Group grow>
          <TextInput
            label="First Name"
            placeholder="First name"
            {...form.getInputProps("firstName")}
          />

          <TextInput
            label="Last Name"
            placeholder="Last name"
            {...form.getInputProps("lastName")}
          />
        </Group>

        <MultiSelect
          label="Groups"
          placeholder="Select groups"
          data={groupOptions}
          {...form.getInputProps("selectedGroups")}
          clearable
          description="Assign group memberships. Default is no group."
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => form.onSubmit(handleSubmit)()} loading={loading}>
            Create User
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
