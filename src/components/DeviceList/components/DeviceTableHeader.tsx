import { TableHeader, TableHeaderCell, TableRow } from "semantic-ui-react";

import { COLUMN_MAP, type DeviceColumnKey } from "../columns";
import type { FilterData, SortDirection } from "../stores/deviceListReducer";
import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

interface DeviceTableHeaderProps {
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly sortColumn: string | null;
  readonly sortDirection: SortDirection;
  readonly filterActive: boolean;
  readonly filterData: FilterData;
  readonly sortClick: (column: DeviceColumnKey) => void;
  readonly handleFilterColumnChange: (column: string, value: string) => void;
}

export function DeviceTableHeader({
  activeColumns,
  sortColumn,
  sortDirection,
  filterActive,
  filterData,
  sortClick,
  handleFilterColumnChange,
}: DeviceTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        {activeColumns.map((column) => (
          <TableHeaderCell
            key={column}
            onClick={() => sortClick(column)}
            sorted={
              sortColumn === column && sortDirection ? sortDirection : undefined
            }
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              ...(column === "id" && {
                maxWidth: "7em",
                minWidth: "7em",
              }),
            }}
            collapsing
          >
            {COLUMN_MAP[column]}
          </TableHeaderCell>
        ))}
      </TableRow>
      {filterActive && (
        <TableRow>
          {activeColumns.map((column) => (
            <TableHeaderCell
              key={`filter_${column}`}
              collapsing
              style={{
                ...(column === "id" && {
                  maxWidth: "7em",
                  minWidth: "7em",
                }),
              }}
            >
              <DeviceTableHeaderFilter
                column={column}
                filterData={filterData}
                handleFilterColumnChange={handleFilterColumnChange}
              />
            </TableHeaderCell>
          ))}
        </TableRow>
      )}
    </TableHeader>
  );
}
