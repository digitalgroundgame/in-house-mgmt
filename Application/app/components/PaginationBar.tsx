import { Paper, Group, ActionIcon } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { ReadonlyURLSearchParams } from "next/navigation";

export function incrementPageSearchParam(searchParams: ReadonlyURLSearchParams): string {
  return (Number.parseInt(searchParams.get('page') ?? '0') + 1).toString()
}

export function decrementPageSearchParam(searchParams: ReadonlyURLSearchParams): string {
  return (Number.parseInt(searchParams.get('page') ?? '0') - 1).toString()
}

export default function PaginationBar(
  {
    totalCount,
    entityName,
    previousUrl,
    nextUrl,
    handlePrevious,
    handleNext
  }: {
    totalCount: number,
    entityName: string,
    previousUrl: string,
    nextUrl: string,
    handlePrevious: () => void,
    handleNext: () => void,
  }) {
  return <Paper p="sm" withBorder>
    <Group justify="space-between">
      <span>{totalCount} {entityName} found</span>
      <Group gap="xs">
        <ActionIcon
          variant="filled"
          disabled={!previousUrl}
          onClick={handlePrevious}
          aria-label="Previous page"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <ActionIcon
          variant="filled"
          disabled={!nextUrl}
          onClick={handleNext}
          aria-label="Next page"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
    </Group>
  </Paper>
}