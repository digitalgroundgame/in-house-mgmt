"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, Text, Title, List, Table, Divider } from "@mantine/core";

interface Props {
  description?: string | null;
}

// --- Helper to flatten React children to string ---
const getText = (children: React.ReactNode): string =>
  !children
    ? ""
    : typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.map(getText).join("")
        : React.isValidElement(children)
          ? getText((children.props as { children?: React.ReactNode }).children)
          : "";

// --- Code block with copy button ---
const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  };

  return (
    <div
      style={{
        position: "relative",
        margin: "1rem 0",
        borderRadius: 6,
        overflow: "hidden",
        fontFamily: "monospace",
        backgroundColor: "#f5f5f5",
        color: "#1e1e1e",
      }}
    >
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: "2px 6px",
          cursor: "pointer",
          fontSize: 12,
          zIndex: 10,
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre style={{ margin: 0, padding: "1rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

// --- Main Markdown renderer ---
export default function TicketDescription({ description }: Props) {
  if (!description)
    return (
      <Card withBorder radius="md" padding="lg">
        <Text c="dimmed" fs="italic">
          No description provided.
        </Text>
      </Card>
    );

  return (
    <Card withBorder radius="md" padding="lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CodeBlock code={getText(children)} />,
          code: ({ className, children }) =>
            !className && (
              <code
                style={{
                  fontFamily: "monospace",
                  background: "#eee",
                  padding: "2px 4px",
                  borderRadius: 4,
                }}
              >
                {getText(children)}
              </code>
            ),
          h1: ({ children }) => (
            <Title order={4} mt="md">
              {children}
            </Title>
          ),
          h2: ({ children }) => (
            <Title order={5} mt="md">
              {children}
            </Title>
          ),
          h3: ({ children }) => (
            <Title order={6} mt="md">
              {children}
            </Title>
          ),
          p: ({ children }) => <Text mb="sm">{children}</Text>,
          ul: ({ children }) => <List withPadding>{children}</List>,
          ol: ({ children }) => (
            <List type="ordered" withPadding>
              {children}
            </List>
          ),
          li: ({ children }) => <List.Item>{children}</List.Item>,
          table: ({ children }) => (
            <Table withTableBorder withColumnBorders striped highlightOnHover my="md">
              {children}
            </Table>
          ),
          thead: ({ children }) => <Table.Thead>{children}</Table.Thead>,
          tbody: ({ children }) => <Table.Tbody>{children}</Table.Tbody>,
          tr: ({ children }) => <Table.Tr>{children}</Table.Tr>,
          th: ({ children }) => <Table.Th fw={600}>{children}</Table.Th>,
          td: ({ children }) => <Table.Td>{children}</Table.Td>,
          hr: () => <Divider my="md" />,
        }}
      >
        {description}
      </ReactMarkdown>
    </Card>
  );
}
