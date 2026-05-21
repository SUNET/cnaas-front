import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { DeviceTableHeaderFilter } from "./DeviceTableHeaderFilter";

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
  test("text input debounces handleFilterColumnChange by 250ms", async () => {
    const handleFilterColumnChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{}}
        handleFilterColumnChange={handleFilterColumnChange}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "abc");
    expect(handleFilterColumnChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(handleFilterColumnChange).toHaveBeenCalledTimes(1);
    expect(handleFilterColumnChange).toHaveBeenCalledWith("hostname", "abc");
  });

  test("rapid typing collapses to a single trailing call", async () => {
    const handleFilterColumnChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{}}
        handleFilterColumnChange={handleFilterColumnChange}
      />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "a");
    await user.type(input, "b");
    await user.type(input, "c");

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(handleFilterColumnChange).toHaveBeenCalledTimes(1);
    expect(handleFilterColumnChange).toHaveBeenLastCalledWith(
      "hostname",
      "abc",
    );
  });

  test("text input reflects filterData prop value", () => {
    render(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{ hostname: "preset" }}
        handleFilterColumnChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("preset");
  });

  test("filterData prop change updates the controlled input", () => {
    const { rerender } = render(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{ hostname: "first" }}
        handleFilterColumnChange={jest.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("first");

    rerender(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{ hostname: "second" }}
        handleFilterColumnChange={jest.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("second");
  });

  test("unmount clears the pending debounce timer", async () => {
    const handleFilterColumnChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { unmount } = render(
      <DeviceTableHeaderFilter
        column="hostname"
        filterData={{}}
        handleFilterColumnChange={handleFilterColumnChange}
      />,
    );

    await user.type(screen.getByRole("textbox"), "x");
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(handleFilterColumnChange).not.toHaveBeenCalled();
  });
});
