"use client";

import { Text, Tooltip, TextProps } from "@mantine/core";
import { useTimezone } from "@/app/components/provider/TimezoneContext";
import { getRelativeTime, formatFullDateTime } from "@/app/utils/datetime";

export interface RelativeTimeProps extends Omit<TextProps, "children"> {
  /** UTC datetime string */
  value: string | null | undefined;
  /** Show tooltip with full datetime (default: true) */
  showTooltip?: boolean;
}

export function RelativeTime({ value, showTooltip = true, ...textProps }: RelativeTimeProps) {
  const { timezone } = useTimezone();

  const relativeText = getRelativeTime(value);
  const tooltipText = formatFullDateTime(value, timezone);

  if (!showTooltip || !value) {
    return <Text {...textProps}>{relativeText || "No date"}</Text>;
  }

  return (
    <Tooltip label={tooltipText} withArrow>
      <Text {...textProps}>{relativeText}</Text>
    </Tooltip>
  );
}
