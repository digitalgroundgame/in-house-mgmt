"use client";

import { Box, Paper, Stack, Text, Group, Badge, Loader, ActionIcon } from "@mantine/core";
import { IconX, IconCheck, IconSelector } from "@tabler/icons-react";
import { useClickOutside } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/app/lib/apiClient";

export interface EnumSelectOption<T = unknown> {
  id: number | string;
  label: string;
  raw?: T;
  hidden: boolean;
  color?: string;
}

interface EnumSelectProps<T = unknown> {
  endpoint: string;
  label?: string;
  limit?: number;
  value?: EnumSelectOption<T> | null;
  onChange: (value: EnumSelectOption<T> | null) => void;
  clearable?: boolean;
  mapResult: (item: T) => EnumSelectOption<T>;
  disabled?: boolean;
  "data-testid"?: string;
}

export function EnumSelect<T = unknown>({
  endpoint,
  label,
  limit = 20,
  value,
  onChange,
  clearable = false,
  mapResult,
  disabled = false,
  "data-testid": dataTestId,
}: EnumSelectProps<T>) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<EnumSelectOption<T>[]>([]);

  const ref = useClickOutside(() => setOpened(false));

  const fetchOptions = useCallback(() => {
    const path = endpoint.replace(/^\/api/, "");
    apiClient
      .get<T[] | { results: T[] }>(`${path}?page_size=${limit}`)
      .then((data) => {
        const items: T[] = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];

        setOptions(items.map(mapResult));
      })
      .finally(() => setLoading(false));
  }, [endpoint, limit, mapResult]);

  useEffect(() => {
    if (!opened) return;

    // Only fetch if we haven't loaded options yet
    if (options.length === 0) {
      fetchOptions();
    }
  }, [opened, options.length, fetchOptions]);
  return (
    <Box ref={ref} pos="relative" data-testid={dataTestId}>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}

      {/* SELECTOR BOX */}
      <Paper
        withBorder
        px="sm"
        py={9}
        radius="sm"
        onClick={() => !disabled && setOpened((o) => !o)}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          backgroundColor: disabled ? "var(--mantine-color-gray-1)" : undefined,
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Badge variant="filled" mt={1} color={value?.color ?? "gray"}>
            {value?.label ?? "Select"}
          </Badge>

          <Group gap={4}>
            {!disabled && clearable && value && (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            )}
            <IconSelector size={16} />
          </Group>
        </Group>
      </Paper>

      {/* DROPDOWN */}
      {opened && (
        <Paper shadow="sm" withBorder p="xs" mt={6} pos="absolute" w="100%" style={{ zIndex: 10 }}>
          {loading ? (
            <Loader size="xs" />
          ) : (
            <Stack gap={4}>
              {options.map((option) => {
                const selected = option.id === value?.id;
                if (option.hidden) return;

                return (
                  <Group
                    gap="xs"
                    key={option.id}
                    onClick={() => {
                      onChange(option);
                      setOpened(false);
                    }}
                    style={{
                      cursor: "pointer",
                      backgroundColor: selected ? "var(--mantine-color-gray-1)" : undefined,
                    }}
                  >
                    <Badge
                      variant={selected ? "filled" : "outline"}
                      color={option.color ?? "gray"}
                      mt={1}
                    >
                      {option.label}
                    </Badge>
                    {selected && <IconCheck size={14} />}
                  </Group>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
