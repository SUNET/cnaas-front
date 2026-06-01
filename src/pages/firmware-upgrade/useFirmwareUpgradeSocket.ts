import { useEffect, type Dispatch } from "react";
import { socket } from "./stores/socket";
import { actions, type Action } from "./firmwareUpgradeReducer";

/**
 * Opens the single shared firmware-upgrade socket for as long as the page is
 * mounted and streams the backend's DEBUG-level log events into the reducer's
 * log buffer. Call once at the page level.
 */
export function useFirmwareUpgradeSocket(
  token: string | null,
  dispatch: Dispatch<Action>,
): void {
  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { loglevel: "DEBUG" });
    };

    const handleError = (error: unknown) => {
      console.log("SOCKET ERROR", error);
    };

    const handleDisconnect = (reason: string, details: unknown) => {
      console.log("SOCKET DISCONNECTED", reason, details);
    };

    const handleEvents = (data: unknown) => {
      dispatch({ type: actions.APPEND_LOG, line: `${data}\n` });
    };

    socket.on("connect", handleConnect);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);
    socket.on("events", handleEvents);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
      socket.off("events", handleEvents);
      socket.disconnect();
    };
  }, [token, dispatch]);
}
