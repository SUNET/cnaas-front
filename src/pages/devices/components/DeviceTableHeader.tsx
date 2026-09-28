import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";

import { useDeviceList } from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { COLUMN_MAP, type SortDirection } from "../types/table";
import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

export function DeviceTableHeader() {
  const { state, dispatch } = useDeviceList();
  const { activeColumns, sortColumn, sortDirection, filterActive } = state;

  const sortClick = (column: string) => {
    let direction: SortDirection;
    if (column === sortColumn) {
      direction = sortDirection === "asc" ? "desc" : "asc";
    } else {
      direction = "desc";
    }
    dispatch({ type: actions.SET_SORT, column, direction });
  };

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
              <DeviceTableHeaderFilter column={column} />
            </TableCell>
          ))}
        </TableRow>
      )}
    </TableHead>
  );
}
