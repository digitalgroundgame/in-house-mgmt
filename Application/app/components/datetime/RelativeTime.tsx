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
  // Relative times don't show timezone (tooltip has full datetime with tz)
  const displayText = relativeText;
  const tooltipText = formatFullDateTime(value, timezone);

  if (!showTooltip || !value) {
    return <Text {...textProps}>{displayText || "No date"}</Text>;
  }

  return (
    <Tooltip label={tooltipText} withArrow>
      <Text {...textProps}>{displayText}</Text>
    </Tooltip>
  );
}
