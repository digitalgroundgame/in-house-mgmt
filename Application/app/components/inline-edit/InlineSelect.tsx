"use client";

import { Select } from "@mantine/core";
import { useState } from "react";
import { InlineEdit } from "./InlineEdit";

export interface InlineSelectProps {
  value: string;
  onSave: (value: string) => void;
  options: { label: string; value: string }[];
  displayComponent: React.ReactNode;
}

export function InlineSelect({ value, onSave, options, displayComponent }: InlineSelectProps) {
  const [editing, setEditing] = useState(false);

  return (
    <InlineEdit
      editing={editing}
      onStartEdit={() => setEditing(true)}
      displayComponent={displayComponent}
    >
      <Select
        data={options}
        value={value}
        onChange={(v) => {
          if (v !== null) {
            onSave(v);
          }
          setEditing(false);
        }}
        allowDeselect={false}
        defaultDropdownOpened
        onDropdownClose={() => setEditing(false)}
        size="xs"
      />
    </InlineEdit>
  );
}
