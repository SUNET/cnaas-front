import PropTypes from "prop-types";
import { TableHeader, TableHeaderCell, TableRow } from "semantic-ui-react";

import { COLUMN_MAP } from "./DeviceList";
import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

DeviceTableHeader.propTypes = {
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.string,
  filterActive: PropTypes.bool,
  filterData: PropTypes.object,
  sortClick: PropTypes.func,
  handleFilterColumnChange: PropTypes.func,
};

export function DeviceTableHeader({
  activeColumns,
  sortColumn,
  sortDirection,
  filterActive,
  filterData,
  sortClick,
  handleFilterColumnChange,
}) {
  return (
    <TableHeader>
      <TableRow>
        {activeColumns.map((column) => {
          return (
            <TableHeaderCell
              key={column}
              onClick={() => sortClick(column)}
              sorted={sortColumn === column ? sortDirection : null}
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
          );
        })}
      </TableRow>
      {/* Setup filter data */}
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
