import { useEffect } from "react";
import { socket } from "./stores/socket";

/**
 * Opens the single shared firmware-copy socket for as long as the page is
 * mounted and subscribes to job lifecycle events. Call once at the page level;
 * individual rows attach their own listeners via useFirmwareCopyJob.
 */
export function useFirmwareCopySocket(token: string | null): void {
  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { update: "job" });
    };

    socket.on("connect", handleConnect);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, [token]);
}
