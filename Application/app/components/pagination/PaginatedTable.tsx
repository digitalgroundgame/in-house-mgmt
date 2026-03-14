import { Checkbox, LoadingOverlay, Table, Title, Text } from "@mantine/core";
import { JSX } from "react";

export interface PaginatedTableProps<T> {
  /**
   * title for the table. only shown if showTitle is set
   */
  title?: string;
  /**
   * determines of the title is displayed or not
   */
  showTitle?: boolean;
  /**
   * column names, in order, for the table
   */
  columns: string[];
  /**
   * transforms which define how to retrieve the column value from the data
   */
  transforms: ((data: T) => JSX.Element)[];
  /**
   * the data, rendered in order
   */
  data: T[];
  loading: boolean;
  /**
   * if the table should render checkboxes
   */
  useCheckboxes?: boolean;
  /**
   * The current selected rows. Is ignroed if useCheckboxes is not true
   */
  selected?: Set<number>;
  /**
   * hook to modify the state when a selection change occurs
   * @param next
   * @returns
   */
  onSelectionChange?: (next: Set<number>) => void;
  /**
   * Used to show absence of data. if undefined does nothing
   */
  noDataText?: string;
  /**
   * function which provides unique keys for each row. used for selection and tracking
   * @param ele: T
   * @returns id/key of type
   */
  keyFn?: (ele: T) => number;
  /**
   * call back for when row is clicked
   * @param ele
   * @returns
   */
  onRowClick?: (ele: T) => void;
}

function toggleOne(prev: Set<number>, id: number) {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

function selectAll<T>(data: T[], keyFn: (ele: T) => number) {
  return new Set(data.map(keyFn));
}

function clearAll() {
  return new Set<number>();
}

/** Generic Paginated Table. The table accepts data of type T and uses transforms
 * to extract the values for a given column. This allows the caller to
 * customize the children of each column
 *
 * @param props
 * @returns
 */
export default function PaginatedTable<T>(props: PaginatedTableProps<T>) {
  const {
    columns,
    transforms,
    data,
    useCheckboxes,
    selected,
    onSelectionChange,
    keyFn,
    onRowClick,
    title,
    showTitle,
    loading,
    noDataText,
  } = props;

  if (useCheckboxes && (!selected || !onSelectionChange || !keyFn)) {
    throw Error("useCheckboxes requires selected, onSelectionChange, and keyFn");
  }

  const allSelected = useCheckboxes && selected && data.length > 0 && selected.size === data.length;

  const partiallySelected =
    useCheckboxes && selected && selected.size > 0 && selected.size < data.length;

  return (
    <>
      {showTitle && (
        <Title order={4}>
          {title} ({data.length})
        </Title>
      )}
      <LoadingOverlay visible={loading} />
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {useCheckboxes && (
              <Table.Th>
                <Checkbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  onChange={() => {
                    if (!selected || !onSelectionChange || !keyFn) return;

                    onSelectionChange(allSelected ? clearAll() : selectAll(data, keyFn));
                  }}
                />
              </Table.Th>
            )}

            {columns.map((col) => (
              <Table.Th key={col}>{col}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {data.length === 0 && noDataText ? (
            <Table.Tr key="no-data">
              <Table.Td colSpan={columns.length}>
                <Text c="dimmed">{noDataText}</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            data.map((ele, index) => {
              const id = keyFn?.(ele);

              return (
                <Table.Tr
                  bg={
                    id !== undefined && selected!.has(id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                  style={{ cursor: "pointer" }}
                  key={id ?? `row-${index}`}
                  onClick={() => onRowClick?.(ele)}
                >
                  {useCheckboxes && id !== undefined && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected!.has(id)}
                        onChange={() => onSelectionChange!(toggleOne(selected!, id))}
                      />
                    </Table.Td>
                  )}

                  {transforms.map((f) => f(ele))}
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </>
  );
}
