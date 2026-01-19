'use client';

import {
  TextInput,
  Paper,
  Stack,
  Text,
  Loader,
  UnstyledButton,
  Box,
  ActionIcon,
  Group,
  ThemeIcon,
} from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react';
import { useDebouncedValue, useClickOutside } from '@mantine/hooks';
import { useCallback, useEffect, useState } from 'react';

export interface SearchSelectOption<T = unknown> {
  id: number | string;
  label: string;
  raw: T;
}

interface SearchSelectProps<T = unknown> {
  endpoint: string;
  label: string;
  placeholder?: string;
  limit?: number;
  value?: SearchSelectOption<T> | null;
  onChange: (value: SearchSelectOption<T> | null) => void;
  clearable?: boolean;
  mapResult: (item: T) => SearchSelectOption<T>;
}

export function SearchSelect<T = unknown>({
  endpoint,
  label,
  placeholder = 'Search…',
  limit = 5,
  value,
  onChange,
  clearable = true,
  mapResult,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 300);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchSelectOption<T>[]>([]);
  const [opened, setOpened] = useState(false);

  const ref = useClickOutside(() => setOpened(false));

  const fetchResults = useCallback((search: string) => {
    setLoading(true);

    fetch(`${endpoint}?search=${encodeURIComponent(search)}&page_size=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        // normalize paginated vs array
        const items: T[] = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];

        setResults(items.slice(0, limit).map(mapResult));
      })
      .finally(() => setLoading(false));
  }, [endpoint, limit, mapResult]);

  useEffect(() => {
    if (opened) fetchResults(debounced); // eslint-disable-line react-hooks/set-state-in-effect
  }, [debounced, opened, fetchResults]);

  return (
    <Box pos="relative" ref={ref}>
      <TextInput
        label={label}
        placeholder={placeholder}
        value={opened ? query : value?.label || query}
        onFocus={() => {
          setOpened(true);
          fetchResults('');
        }}
        onChange={(e) => {
          setQuery(e.currentTarget.value);
          onChange(null);
        }}
        rightSection={
          loading ? (
            <Loader size="xs" />
          ) : (
            value &&
            clearable && (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => {
                  onChange(null);
                  setQuery('');
                  setOpened(false);
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            )
          )
        }
      />

      {opened && results.length > 0 && (
        <Paper shadow="sm" withBorder mt={4} p="xs" pos="absolute" w="100%" style={{ zIndex: 10 }}>
          <Stack gap={2}>
            {results.map((option) => {
              const selected = option.id === value?.id;

              return (
                <UnstyledButton
                  key={option.id}
                  onClick={() => {
                    onChange(option);
                    setOpened(false);
                    setQuery('');
                  }}
                >
                  <Group gap="xs">
                    <Text size="sm" fw={selected ? 700 : 400}>
                      {option.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
