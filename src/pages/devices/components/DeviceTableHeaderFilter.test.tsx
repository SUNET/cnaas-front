import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as DeviceListContext from "../stores/DeviceListContext";
import { buildInitialState } from "../stores/deviceListReducer";
import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

jest.mock("../stores/DeviceListContext", () => ({
  useDeviceList: jest.fn(),
  useDeviceListPageActions: jest.fn(),
}));

const mockUseDeviceList = DeviceListContext.useDeviceList as jest.Mock;
const mockUseDeviceListPageActions =
  DeviceListContext.useDeviceListPageActions as jest.Mock;

const setup = (filterData: Record<string, string> = {}) => {
  const handleFilterChange = jest.fn();
  mockUseDeviceList.mockReturnValue({
    state: buildInitialState({
      filterData,
      filterActive: true,
      sortColumn: null,
      sortDirection: false,
      activePage: 1,
      activeColumns: ["id", "hostname"],
      resultsPerPage: 20,
    }),
    dispatch: jest.fn(),
  });
  mockUseDeviceListPageActions.mockReturnValue({ handleFilterChange });
  return { handleFilterChange };
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("DeviceTableHeaderFilter", () => {
  test("text input debounces handleFilterChange by 250ms", async () => {
    const { handleFilterChange } = setup();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<DeviceTableHeaderFilter column="hostname" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "abc");
    expect(handleFilterChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(handleFilterChange).toHaveBeenCalledTimes(1);
    expect(handleFilterChange).toHaveBeenCalledWith({ hostname: "abc" });
  });

  test("rapid typing collapses to a single trailing call", async () => {
    const { handleFilterChange } = setup();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<DeviceTableHeaderFilter column="hostname" />);

    const input = screen.getByRole("textbox");
    await user.type(input, "a");
    await user.type(input, "b");
    await user.type(input, "c");

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(handleFilterChange).toHaveBeenCalledTimes(1);
    expect(handleFilterChange).toHaveBeenLastCalledWith({ hostname: "abc" });
  });

  test("text input reflects filterData from context", () => {
    setup({ hostname: "preset" });

    render(<DeviceTableHeaderFilter column="hostname" />);

    expect(screen.getByRole("textbox")).toHaveValue("preset");
  });

  test("filterData change from context updates the controlled input", () => {
    setup({ hostname: "first" });
    const { rerender } = render(<DeviceTableHeaderFilter column="hostname" />);
    expect(screen.getByRole("textbox")).toHaveValue("first");

    setup({ hostname: "second" });
    rerender(<DeviceTableHeaderFilter column="hostname" />);
    expect(screen.getByRole("textbox")).toHaveValue("second");
  });

  test("unmount clears the pending debounce timer", async () => {
    const { handleFilterChange } = setup();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { unmount } = render(<DeviceTableHeaderFilter column="hostname" />);

    await user.type(screen.getByRole("textbox"), "x");
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(handleFilterChange).not.toHaveBeenCalled();
  });
});
