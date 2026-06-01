import { renderHook } from "@testing-library/react";
import { useFirmwareUpgradeSocket } from "./useFirmwareUpgradeSocket";
import { socket } from "../stores/socket";
import { actions } from "../stores/firmwareUpgradeReducer";
import type { SocketMock } from "../../../test-utils/socketMock";

// jest hoists jest.mock above imports, so the factory must require() the
// shared helper rather than close over an imported binding.
jest.mock("../stores/socket", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../../test-utils/socketMock").createSocketMock(),
);

const mockSocket = socket as unknown as SocketMock;

describe("useFirmwareUpgradeSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("connects with the token and subscribes to DEBUG logs on connect", () => {
    renderHook(() => useFirmwareUpgradeSocket("tok", jest.fn()));

    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockSocket.__emit("connect");
    expect(mockSocket.emit).toHaveBeenCalledWith("events", {
      loglevel: "DEBUG",
    });
  });

  it("dispatches an APPEND_LOG action for each log event", () => {
    const dispatch = jest.fn();
    renderHook(() => useFirmwareUpgradeSocket("tok", dispatch));

    mockSocket.__emit("events", "device booted");

    expect(dispatch).toHaveBeenCalledWith({
      type: actions.APPEND_LOG,
      line: "device booted\n",
    });
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() =>
      useFirmwareUpgradeSocket("tok", jest.fn()),
    );

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a token", () => {
    renderHook(() => useFirmwareUpgradeSocket(null, jest.fn()));

    expect(mockSocket.connect).not.toHaveBeenCalled();
  });
});
