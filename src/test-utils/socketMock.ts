/**
 * Shared mock for the firmware-upgrade Socket.IO client (`../stores/socket`).
 *
 * Use inside a `jest.mock` factory. Because `jest.mock` is hoisted above the
 * imports, the factory can't close over an imported binding — reference this
 * helper through `require` instead:
 *
 *   jest.mock("../stores/socket", () =>
 *     require("../../../test-utils/socketMock").createSocketMock(),
 *   );
 *
 * The returned socket records `on`/`off` handlers so tests can drive events via
 * `__emit(event, data)`; `connect`/`disconnect`/`emit` are plain jest mocks.
 */
export type SocketMock = {
  readonly io: { opts: Record<string, unknown> };
  readonly on: jest.Mock;
  readonly off: jest.Mock;
  readonly emit: jest.Mock;
  readonly connect: jest.Mock;
  readonly disconnect: jest.Mock;
  /** Synchronously invoke every handler registered for `event`. */
  readonly __emit: (event: string, data?: unknown) => void;
};

export function createSocketMock(): { socket: SocketMock } {
  const listeners: Record<string, Array<(data?: unknown) => void>> = {};
  return {
    socket: {
      io: { opts: {} },
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
}
