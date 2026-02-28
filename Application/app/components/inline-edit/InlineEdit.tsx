"use client";

import { Box } from "@mantine/core";

export interface InlineEditProps {
  editing: boolean;
  onStartEdit: () => void;
  displayComponent: React.ReactNode;
  children: React.ReactNode;
}

export function InlineEdit({ editing, onStartEdit, displayComponent, children }: InlineEditProps) {
  if (editing) {
    return <>{children}</>;
  }

  return (
    <Box style={{ cursor: "pointer" }} onClick={onStartEdit}>
      {displayComponent}
    </Box>
  );
}

export function makeUnstyled(fontSize?: string, fontWeight?: string, forTextarea = false) {
  const base: Record<string, string | number> = {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    lineHeight: "inherit",
    fontSize: fontSize ?? "inherit",
    fontWeight: fontWeight ?? "inherit",
    fontFamily: "inherit",
    color: "inherit",
  };
  if (!forTextarea) {
    base.height = "auto";
    base.minHeight = "unset";
  }
  return { input: base };
}
