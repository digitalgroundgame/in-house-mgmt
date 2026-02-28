"use client";

import { Textarea } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { InlineEdit, makeUnstyled } from "./InlineEdit";

export interface InlineTextareaProps {
  value: string;
  onSave: (value: string) => void;
  displayComponent: React.ReactNode;
  fontSize?: string;
  fontWeight?: string;
}

export function InlineTextarea({
  value,
  onSave,
  displayComponent,
  fontSize,
  fontWeight,
}: InlineTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <InlineEdit
      editing={editing}
      onStartEdit={() => {
        setDraft(value);
        setEditing(true);
      }}
      displayComponent={displayComponent}
    >
      <Textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
        minRows={1}
        autosize
        styles={makeUnstyled(fontSize, fontWeight, true)}
      />
    </InlineEdit>
  );
}
