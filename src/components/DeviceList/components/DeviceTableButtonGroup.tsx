import {
  Button,
  ButtonGroup,
  Checkbox,
  Icon,
  Popup,
  Select,
} from "semantic-ui-react";
import { COLUMN_MAP, type DeviceColumnKey } from "../types/columns";
import type { FilterData, SortDirection } from "../types/table";

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
  readonly setSortColumn: (column: string | null) => void;
  readonly setSortDirection: (direction: SortDirection) => void;
};

export function DeviceTableButtonGroup({
  activeColumns,
  setFilterActive,
  handleFilterChange,
  columnSelectorChange,
  resultsPerPage,
  setActivePage,
  setResultsPerPage,
  setSortColumn,
  setSortDirection,
}: DeviceTableButtonGroupProps) {
  return (
    <ButtonGroup icon>
      <Button
        icon
        basic
        size="small"
        onClick={() => setFilterActive((prev) => !prev)}
        title="Search / Filter"
      >
        <Icon name="filter" />
      </Button>
      <Button
        icon
        basic
        size="small"
        onClick={() => {
          setFilterActive(false);
          handleFilterChange({});
          setSortColumn(null);
          setSortDirection(null);
        }}
        title="Clear Filter and Sorting"
      >
        <Icon name="close" />
      </Button>
      <Popup
        on="click"
        pinned
        position="bottom right"
        trigger={
          <Button icon basic size="small" title="Select Columns">
            <Icon name="columns" />
          </Button>
        }
      >
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
              <Checkbox
                defaultChecked={activeColumns.includes(columnName)}
                label={COLUMN_MAP[columnName]}
                name={columnName}
                onClick={() => columnSelectorChange(columnName)}
              />
            </li>
          ))}
        </ul>
      </Popup>
    </ButtonGroup>
  );
}
