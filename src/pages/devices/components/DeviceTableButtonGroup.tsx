import { useState, type SyntheticEvent } from "react";
import { Select } from "semantic-ui-react";
import Popover from "@mui/material/Popover";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import {
  COLUMN_MAP,
  type DeviceColumnKey,
  type FilterData,
} from "../types/table";

const PER_PAGE_OPTIONS = [
  { key: 20, value: 20, text: "20" },
  { key: 50, value: 50, text: "50" },
  { key: 100, value: 100, text: "100" },
  { key: 500, value: 500, text: "500" },
  { key: 1000, value: 1000, text: "1000" },
];

const EXTRA_COLUMNS: readonly DeviceColumnKey[] = [
  "model",
  "os_version",
  "management_ip",
  "dhcp_ip",
  "serial",
  "vendor",
  "platform",
];

type DeviceTableButtonGroupProps = {
  readonly activeColumns: readonly DeviceColumnKey[];
  readonly setFilterActive: (
    value: boolean | ((prev: boolean) => boolean),
  ) => void;
  readonly handleFilterChange: (next: FilterData) => void;
  readonly columnSelectorChange: (column: DeviceColumnKey) => void;
  readonly resultsPerPage: number;
  readonly setActivePage: (page: number) => void;
  readonly setResultsPerPage: (perPage: number) => void;
  readonly clearSort: () => void;
};

export function DeviceTableButtonGroup({
  activeColumns,
  setFilterActive,
  handleFilterChange,
  columnSelectorChange,
  resultsPerPage,
  setActivePage,
  setResultsPerPage,
  clearSort,
}: DeviceTableButtonGroupProps) {
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  return (
    <div>
      <IconButton
        size="small"
        onClick={() => setFilterActive((prev) => !prev)}
        title="Search / Filter"
        aria-label="Search / Filter"
      >
        <FilterListIcon />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => {
          setFilterActive(false);
          handleFilterChange({});
          clearSort();
        }}
        title="Clear Filter and Sorting"
        aria-label="Clear Filter and Sorting"
      >
        <CloseIcon />
      </IconButton>
      <IconButton
        size="small"
        title="Select Columns"
        aria-label="Select Columns"
        onClick={(e: SyntheticEvent) =>
          setColumnsAnchorEl(e.currentTarget as HTMLElement)
        }
      >
        <ViewColumnIcon />
      </IconButton>
      <Popover
        open={Boolean(columnsAnchorEl)}
        anchorEl={columnsAnchorEl}
        onClose={() => setColumnsAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div style={{ padding: "var(--size-md)" }}>
          <p>Items per page:</p>
          <Select
            options={PER_PAGE_OPTIONS}
            value={resultsPerPage}
            onChange={(_, { value }) => {
              if (typeof value === "number") {
                setResultsPerPage(value);
                setActivePage(1);
              }
            }}
          />
          <p>Show extra columns:</p>
          <ul>
            {EXTRA_COLUMNS.map((columnName) => (
              <li key={columnName}>
                <FormControlLabel
                  control={
                    <Checkbox
                      defaultChecked={activeColumns.includes(columnName)}
                      name={columnName}
                      onClick={() => columnSelectorChange(columnName)}
                    />
                  }
                  label={COLUMN_MAP[columnName]}
                />
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </div>
  );
}
