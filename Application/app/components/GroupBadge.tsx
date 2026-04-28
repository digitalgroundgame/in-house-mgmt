import { Badge } from "@mantine/core";

const DEFAULT_COLOR = "blue";

interface GroupBadgeProps {
  group: string;
}

export function GroupBadge({ group }: GroupBadgeProps) {
  const isAdmin = group === "ADMIN";
  return (
    <Badge variant={isAdmin ? "filled" : "light"} color={isAdmin ? "red" : DEFAULT_COLOR}>
      {group}
    </Badge>
  );
}
