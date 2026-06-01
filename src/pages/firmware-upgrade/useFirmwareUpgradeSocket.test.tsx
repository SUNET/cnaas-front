import { renderHook } from "@testing-library/react";
import { useFirmwareUpgradeSocket } from "./useFirmwareUpgradeSocket";
import { socket } from "./stores/socket";
import { actions } from "./firmwareUpgradeReducer";

jest.mock("./stores/socket", () => {
  const listeners: Record<string, Array<(data?: unknown) => void>> = {};
  return {
    socket: {
      io: { opts: {} as Record<string, unknown> },
      on: jest.fn((event: string, cb: (data?: unknown) => void) => {
        listeners[event] ||= [];
        listeners[event].push(cb);
      }),
      off: jest.fn((event: string, cb: (data?: unknown) => void) => {
        listeners[event] = (listeners[event] || []).filter((h) => h !== cb);
      }),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      __emit: (event: string, data?: unknown) => {
        (listeners[event] || []).forEach((h) => h(data));
      },
    },
  };
});

const mockSocket = socket as unknown as {
  connect: jest.Mock;
  disconnect: jest.Mock;
  emit: jest.Mock;
  __emit: (event: string, data?: unknown) => void;
};

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
