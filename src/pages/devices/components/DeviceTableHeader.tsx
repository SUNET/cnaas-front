import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";

import {
  COLUMN_MAP,
  type DeviceColumnKey,
  type FilterData,
  type SortDirection,
} from "../types/table";
import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

type DeviceTableHeaderProps = {
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly sortColumn: string | null;
  readonly sortDirection: SortDirection;
  readonly filterActive: boolean;
  readonly filterData: FilterData;
  readonly sortClick: (column: DeviceColumnKey) => void;
  readonly handleFilterColumnChange: (column: string, value: string) => void;
};

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
    <TableHead>
      <TableRow>
        {activeColumns.map((column) => (
          <TableCell
            key={column}
            onClick={() => sortClick(column)}
            sortDirection={
              sortColumn === column && sortDirection ? sortDirection : undefined
            }
            sx={{
              cursor: "pointer",
              ...(column === "id" && {
                maxWidth: "7em",
                minWidth: "7em",
              }),
            }}
          >
            <TableSortLabel
              active={sortColumn === column}
              direction={
                sortColumn === column && sortDirection ? sortDirection : "asc"
              }
            >
              {COLUMN_MAP[column]}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
      {filterActive && (
        <TableRow>
          {activeColumns.map((column) => (
            <TableCell
              key={`filter_${column}`}
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
            </TableCell>
          ))}
        </TableRow>
      )}
    </TableHead>
  );
}
