import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceTableButtonGroup } from "./DeviceTableButtonGroup";

const baseProps = () => ({
  activeColumns: ["id", "hostname"] as const,
  setFilterActive: jest.fn(),
  handleFilterChange: jest.fn(),
  columnSelectorChange: jest.fn(),
  resultsPerPage: 20,
  setActivePage: jest.fn(),
  setResultsPerPage: jest.fn(),
  setSortColumn: jest.fn(),
  setSortDirection: jest.fn(),
});

describe("DeviceTableButtonGroup", () => {
  test("filter button toggles filterActive via updater", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<DeviceTableButtonGroup {...props} />);

    await user.click(screen.getByTitle("Search / Filter"));

    expect(props.setFilterActive).toHaveBeenCalledTimes(1);
    const updater = props.setFilterActive.mock.calls[0][0] as (
      prev: boolean,
    ) => boolean;
    expect(typeof updater).toBe("function");
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

  test("clear button resets filter, sort, and disables filter UI", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<DeviceTableButtonGroup {...props} />);

    await user.click(screen.getByTitle("Clear Filter and Sorting"));

    expect(props.setFilterActive).toHaveBeenCalledWith(false);
    expect(props.handleFilterChange).toHaveBeenCalledWith({});
    expect(props.setSortColumn).toHaveBeenCalledWith(null);
    expect(props.setSortDirection).toHaveBeenCalledWith(null);
  });
});
