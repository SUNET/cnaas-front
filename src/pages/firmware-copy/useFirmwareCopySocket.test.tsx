import { renderHook } from "@testing-library/react";
import { useFirmwareCopySocket } from "./useFirmwareCopySocket";
import { socket } from "./stores/socket";

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

describe("useFirmwareCopySocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("connects with the token and subscribes to job events on connect", () => {
    renderHook(() => useFirmwareCopySocket("tok"));

    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockSocket.__emit("connect");
    expect(mockSocket.emit).toHaveBeenCalledWith("events", { update: "job" });
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() => useFirmwareCopySocket("tok"));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a token", () => {
    renderHook(() => useFirmwareCopySocket(null));

    expect(mockSocket.connect).not.toHaveBeenCalled();
  });
});
