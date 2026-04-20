"use client";

import { Modal, Stack, TextInput, Button, Group, MultiSelect } from "@mantine/core";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { apiClient } from "@/app/lib/apiClient";
import { useForm } from "@mantine/form";

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

interface CreateUserPayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  groups: string[];
}

export default function AddUserModal({ opened, onClose, onSuccess, availableGroups }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      selectedGroups: [] as string[],
    },

    validate: {
      username: (value) => {
        if (!value.trim()) return "Username is required";
        if (value.trim().length < 3) return "Username must be at least 3 characters";
        return null;
      },
      email: (value) => {
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
        return null;
      },
    },
  });

  useEffect(() => {
    if (opened) form.reset();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    const payload: CreateUserPayload = {
      username: values.username.trim(),
      email: values.email.trim(),
      groups: values.selectedGroups,
      ...(values.firstName.trim() && { first_name: values.firstName.trim() }),
      ...(values.lastName.trim() && { last_name: values.lastName.trim() }),
    };

    try {
      await apiClient.post("/management/users/", payload);
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
        } else if (err.message.includes("400")) {
          errorMessage = "Invalid data provided. Please check your input.";
        } else if (err.message.includes("403")) {
          errorMessage = "You do not have permission to create users.";
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

        <TextInput
          label="Email"
          placeholder="user@example.com"
          required
          description="Primary email address for this user"
          {...form.getInputProps("email")}
        />

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
