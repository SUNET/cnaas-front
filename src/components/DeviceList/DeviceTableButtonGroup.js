import PropTypes from "prop-types";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Icon,
  Popup,
  Select,
} from "semantic-ui-react";
import { COLUMN_MAP } from "./DeviceList";

const PER_PAGE_OPTIONS = [
  { key: 20, value: 20, text: "20" },
  { key: 50, value: 50, text: "50" },
  { key: 100, value: 100, text: "100" },
  { key: 500, value: 500, text: "500" },
  { key: 1000, value: 1000, text: "1000" },
];

DeviceTableButtonGroup.propTypes = {
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  setFilterActive: PropTypes.func,
  handleFilterChange: PropTypes.func,
  columnSelectorChange: PropTypes.func,
  resultsPerPage: PropTypes.number,
  setActivePage: PropTypes.func,
  setResultsPerPage: PropTypes.func,
  setSortColumn: PropTypes.func,
  setSortDirection: PropTypes.func,
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
}) {
  const extraColumns = [
    "model",
    "os_version",
    "management_ip",
    "dhcp_ip",
    "serial",
    "vendor",
    "platform",
  ];
  return (
    <ButtonGroup icon>
      <Button
        icon
        basic
        size="small"
        onClick={() => {
          setFilterActive((prev) => !prev);
        }}
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
          onChange={(e, { value }) => {
            setResultsPerPage(value);
            // Make sure page resets to 1 when changing this option
            setActivePage(1);
          }}
        />
        <p>Show extra columns:</p>
        <ul>
          {extraColumns.map((columnName) => {
            const checked = activeColumns.includes(columnName);
            return (
              <li key={columnName}>
                <Checkbox
                  defaultChecked={checked}
                  label={COLUMN_MAP[columnName]}
                  name={columnName}
                  onClick={() => {
                    columnSelectorChange(columnName);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </Popup>
    </ButtonGroup>
  );
}
