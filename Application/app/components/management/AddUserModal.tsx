"use client";

import { Modal, Stack, TextInput, Button, Group, MultiSelect } from "@mantine/core";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { apiClient } from "@/app/lib/apiClient";

interface Group {
  id: number;
  name: string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  groups: Group[];
}

interface CreateUserPayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  groups: string[];
}

export default function AddUserModal({ opened, onClose, onSuccess, groups }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (opened) {
      setUsername("");
      setEmail("");
      setFirstName("");
      setLastName("");
      setSelectedGroups([]);
      setErrors({});
    }
  }, [opened]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    const payload: CreateUserPayload = {
      username: username.trim(),
      email: email.trim(),
      groups: selectedGroups,
    };

    if (firstName.trim()) {
      payload.first_name = firstName.trim();
    }
    if (lastName.trim()) {
      payload.last_name = lastName.trim();
    }

    try {
      await apiClient.post("/management/users/", payload);
      notifications.show({
        title: "Success",
        message: `User "${username}" created successfully`,
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

  const groupOptions = groups.map((g) => ({ value: g.name, label: g.name }));

  return (
    <Modal opened={opened} onClose={onClose} title="Add New User" size="md" centered>
      <Stack gap="md">
        <TextInput
          label="Username"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          error={errors.username}
          required
          description="Used for login. Must be unique."
        />

        <TextInput
          label="Email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          error={errors.email}
          required
          description="Primary email address for this user"
        />

        <Group grow>
          <TextInput
            label="First Name"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
          />

          <TextInput
            label="Last Name"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
          />
        </Group>

        <MultiSelect
          label="Groups"
          placeholder="Select groups"
          data={groupOptions}
          value={selectedGroups}
          onChange={setSelectedGroups}
          clearable
          description="Assign group memberships. Default is no group."
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create User
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
