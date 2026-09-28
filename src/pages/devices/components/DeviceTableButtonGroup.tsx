import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useState, type SyntheticEvent } from "react";

import {
  useDeviceList,
  useDeviceListPageActions,
} from "../stores/DeviceListContext";
import { actions } from "../stores/deviceListReducer";
import { COLUMN_MAP, type DeviceColumnKey } from "../types/table";

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

export function DeviceTableButtonGroup() {
  const { state, dispatch } = useDeviceList();
  const { handleFilterChange } = useDeviceListPageActions();
  const { activeColumns, filterActive, resultsPerPage } = state;
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(
    null,
  );

  const columnSelectorChange = (column: DeviceColumnKey, checked?: boolean) => {
    const shouldShow = checked ?? !activeColumns.includes(column);
    const newColumns: DeviceColumnKey[] = shouldShow
      ? [...new Set([...activeColumns, column])]
      : activeColumns.filter((c) => c !== column);

    newColumns.sort(
      (a, b) =>
        Object.keys(COLUMN_MAP).indexOf(a) - Object.keys(COLUMN_MAP).indexOf(b),
    );
    dispatch({ type: actions.SET_ACTIVE_COLUMNS, columns: newColumns });
  };

  const columnsOpen = Boolean(columnsAnchorEl);

  return (
    <div>
      <IconButton
        size="small"
        color={filterActive ? "secondary" : "default"}
        aria-pressed={filterActive}
        onClick={() =>
          dispatch({ type: actions.SET_FILTER_ACTIVE, active: !filterActive })
        }
        title="Search / Filter"
        aria-label="Search / Filter"
      >
        <FilterListIcon />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => {
          dispatch({ type: actions.CLEAR_FILTER_AND_SORT });
          handleFilterChange({});
        }}
        title="Clear Filter and Sorting"
        aria-label="Clear Filter and Sorting"
      >
        <CloseIcon />
      </IconButton>
      <IconButton
        size="small"
        color={columnsOpen ? "secondary" : "default"}
        aria-pressed={columnsOpen}
        title="Select Columns"
        aria-label="Select Columns"
        onClick={(e: SyntheticEvent) =>
          setColumnsAnchorEl(e.currentTarget as HTMLElement)
        }
      >
        <ViewColumnIcon />
      </IconButton>

      <Popover
        open={columnsOpen}
        anchorEl={columnsAnchorEl}
        onClose={() => setColumnsAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ m: 2 }}>
          <FormControl sx={{ minWidth: (theme) => theme.spacing(20) }}>
            <InputLabel id="device-per-page-label-id">
              Items per page
            </InputLabel>
            <Select
              labelId="device-per-page-label-id"
              label="Items per page"
              value={resultsPerPage}
              onChange={(event: SelectChangeEvent<number>) => {
                const parsed = Number(event.target.value);
                if (Number.isInteger(parsed)) {
                  dispatch({
                    type: actions.SET_RESULTS_PER_PAGE,
                    perPage: event.target.value,
                  });
                  dispatch({ type: actions.SET_ACTIVE_PAGE, page: 1 });
                }
              }}
            >
              {PER_PAGE_OPTIONS.map((option) => (
                <MenuItem key={option.key} value={option.value}>
                  {option.text}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <p>Show extra columns:</p>
          <ul>
            {EXTRA_COLUMNS.map((columnName) => (
              <li key={columnName}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={activeColumns.includes(columnName)}
                      name={columnName}
                      onChange={(e) =>
                        columnSelectorChange(columnName, e.target.checked)
                      }
                    />
                  }
                  label={COLUMN_MAP[columnName]}
                />
              </li>
            ))}
          </ul>
        </Box>
      </Popover>
    </div>
  );
}
