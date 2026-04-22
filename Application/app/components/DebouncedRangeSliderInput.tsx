"use client";

import { RangeSlider, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";

type RangeValue = [number, number];

interface DebouncedRangeSliderInputProps {
  label: string;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  onDebouncedChange: (value: RangeValue) => void;
  min?: number;
  max?: number;
  minRange?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  debounceMs?: number;
  width?: number;
  labelFormatter?: (value: number) => string | number;
}

function isSameRange(a: RangeValue | null, b: RangeValue) {
  return a?.[0] === b[0] && a?.[1] === b[1];
}

export default function DebouncedRangeSliderInput({
  label,
  value,
  onChange,
  onDebouncedChange,
  min = 0,
  max = 100,
  minRange = 0,
  size = "sm",
  debounceMs = 300,
  width = 180,
  labelFormatter,
}: DebouncedRangeSliderInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<RangeValue | null>(null);

  useEffect(() => {
    if (!isSameRange(pendingValueRef.current, value) && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingValueRef.current = null;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (nextValue: RangeValue) => {
    onChange(nextValue);
    pendingValueRef.current = nextValue;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onDebouncedChange(nextValue);
      timerRef.current = null;
      pendingValueRef.current = null;
    }, debounceMs);
  };

  return (
    <Stack gap={2} style={{ width }} pb={10}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <RangeSlider
        min={min}
        max={max}
        minRange={minRange}
        value={value}
        onChange={handleChange}
        size={size}
        label={labelFormatter}
      />
    </Stack>
  );
}
