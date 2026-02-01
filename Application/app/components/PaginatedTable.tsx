import { Checkbox, Table } from "@mantine/core";
import { JSX } from "react";

export interface PaginatedTableProps<T> {
  columns: string[]
  /** for each column, provide a transform for the corresponding data. 
   * The transform should return a Table.td
   * 
   * @param data 
   * @returns 
   */
  transforms: ((data: T) => JSX.Element)[]
  data: T[]
  useCheckboxes?: boolean
  onSelect?: ((ele: T) => void)
  selected?: Set<number>
  onRowClick?: (ele: T) => void
  keyFn?: (ele: T) => number
}

export function rowSelectionStateChange(prev: Set<number>, id: number) {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

/** Generic Paginated Table
 * 
 * @param props 
 * @returns 
 */
export default function PaginatedTable<T>(props: PaginatedTableProps<T>) {
  if (props.useCheckboxes && (!props.onSelect || !props.selected || !props.onRowClick || !props.keyFn)) {
    throw Error("useCheckboxes, onSelect, selected, onRowClick, and keyFn must both be used together or not at all")
  }

  return <>
  <Table>
    <Table.Thead>
      <Table.Tr>
        <Table.Th><Checkbox checked={props.selected?.size === props.data.length} onChange={() => props.data.map(props.onSelect!)}/></Table.Th>
        {props.columns.map((s) => <Table.Th key={s}>{s}</Table.Th>)}
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
        {props.data.map((ele: T, idx) => {
          console.log(props.keyFn!(ele))
          return <Table.Tr key={props.keyFn!(ele)} onClick={() => props.onRowClick!(ele)}>
            {props.useCheckboxes && <Table.Td onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={props.selected!.has(props.keyFn!(ele))} onChange={() => props.onSelect!(ele)}/>
              </Table.Td>}
            {props.transforms.map((f) => f(ele))}
          </Table.Tr>
        })}
    </Table.Tbody>
  </Table>
  </>
}