"use client";

import { TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { InlineEdit, makeUnstyled } from "./InlineEdit";

export interface InlineDatetimeProps {
  value: string;
  onSave: (value: string) => void;
  displayComponent: React.ReactNode;
}

export function InlineDatetime({ value, onSave, displayComponent }: InlineDatetimeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <InlineEdit
      editing={editing}
      onStartEdit={() => {
        setDraft(value);
        setEditing(true);
      }}
      displayComponent={displayComponent}
    >
      <TextInput
        ref={inputRef}
        type="datetime-local"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        styles={makeUnstyled()}
      />
    </InlineEdit>
  );
}
