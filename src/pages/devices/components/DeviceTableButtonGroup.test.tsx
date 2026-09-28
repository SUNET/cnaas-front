import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as DeviceListContext from "../stores/DeviceListContext";
import { actions, buildInitialState } from "../stores/deviceListReducer";
import { DeviceTableButtonGroup } from "./DeviceTableButtonGroup";

jest.mock("../stores/DeviceListContext", () => ({
  useDeviceList: jest.fn(),
  useDeviceListPageActions: jest.fn(),
}));

const mockUseDeviceList = DeviceListContext.useDeviceList as jest.Mock;
const mockUseDeviceListPageActions =
  DeviceListContext.useDeviceListPageActions as jest.Mock;

const baseState = () =>
  buildInitialState({
    filterData: {},
    filterActive: false,
    sortColumn: null,
    sortDirection: false,
    activePage: 1,
    activeColumns: ["id", "hostname"],
    resultsPerPage: 20,
  });

describe("DeviceTableButtonGroup", () => {
  let dispatch: jest.Mock;
  let handleFilterChange: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    handleFilterChange = jest.fn();
    mockUseDeviceList.mockReturnValue({ state: baseState(), dispatch });
    mockUseDeviceListPageActions.mockReturnValue({ handleFilterChange });
  });

  test("filter button toggles filterActive", async () => {
    const user = userEvent.setup();
    render(<DeviceTableButtonGroup />);

    await user.click(screen.getByTitle("Search / Filter"));

    expect(dispatch).toHaveBeenCalledWith({
      type: actions.SET_FILTER_ACTIVE,
      active: true,
    });
  });

  test("clear button resets filter and sorting", async () => {
    const user = userEvent.setup();
    render(<DeviceTableButtonGroup />);

    await user.click(screen.getByTitle("Clear Filter and Sorting"));

    expect(dispatch).toHaveBeenCalledWith({
      type: actions.CLEAR_FILTER_AND_SORT,
    });
    expect(handleFilterChange).toHaveBeenCalledWith({});
  });
});
