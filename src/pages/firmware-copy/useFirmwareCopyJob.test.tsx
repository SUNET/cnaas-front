import { renderHook } from "@testing-library/react";
import { useFirmwareCopyJob } from "./useFirmwareCopyJob";
import { socket } from "./stores/socket";

// Fake socket that records "events" listeners and lets tests push server
// messages to them via __emit.
jest.mock("./stores/socket", () => {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};
  return {
    socket: {
      on: jest.fn((event: string, cb: (data: unknown) => void) => {
        (listeners[event] ||= []).push(cb);
      }),
      off: jest.fn((event: string, cb: (data: unknown) => void) => {
        listeners[event] = (listeners[event] || []).filter((h) => h !== cb);
      }),
      __emit: (event: string, data: unknown) => {
        (listeners[event] || []).forEach((h) => h(data));
      },
      __listenerCount: (event: string) => (listeners[event] || []).length,
    },
  };
});

const mockSocket = socket as unknown as {
  __emit: (event: string, data: unknown) => void;
  __listenerCount: (event: string) => number;
};

const jobEvent = (jobId: number, status: string) => ({
  job_id: jobId,
  status,
  function_name: "device_upgrade",
  scheduled_by: "admin",
});

describe("useFirmwareCopyJob", () => {
  it("calls onComplete when its job reaches a terminal state", () => {
    const onComplete = jest.fn();
    renderHook(() => useFirmwareCopyJob(7, onComplete));

    mockSocket.__emit("events", jobEvent(7, "FINISHED"));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores events for a different job id", () => {
    const onComplete = jest.fn();
    renderHook(() => useFirmwareCopyJob(7, onComplete));

    mockSocket.__emit("events", jobEvent(8, "FINISHED"));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("ignores non-terminal status updates", () => {
    const onComplete = jest.fn();
    renderHook(() => useFirmwareCopyJob(7, onComplete));

    mockSocket.__emit("events", jobEvent(7, "RUNNING"));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("treats ABORTED as terminal", () => {
    const onComplete = jest.fn();
    renderHook(() => useFirmwareCopyJob(7, onComplete));

    mockSocket.__emit("events", jobEvent(7, "ABORTED"));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("registers no listener while there is no active job", () => {
    const onComplete = jest.fn();
    renderHook(() => useFirmwareCopyJob(null, onComplete));

    expect(mockSocket.__listenerCount("events")).toBe(0);
  });

  it("keeps concurrent watchers independent — one completing/unmounting does not affect the other", () => {
    const onA = jest.fn();
    const onB = jest.fn();
    const watcherA = renderHook(() => useFirmwareCopyJob(1, onA));
    renderHook(() => useFirmwareCopyJob(2, onB));

    // job 1 finishes: only A reacts
    mockSocket.__emit("events", jobEvent(1, "FINISHED"));
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();

    // A unmounts (its job is done) — B's listener must survive
    watcherA.unmount();
    mockSocket.__emit("events", jobEvent(2, "FINISHED"));
    expect(onB).toHaveBeenCalledTimes(1);
  });
});
