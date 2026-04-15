import { useEffect, useRef, type Dispatch, type MutableRefObject } from "react";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { socket } from "./socket";
import {
  actions,
  type Action,
  type InterfaceConfigState,
} from "./interfaceConfigReducer";

/**
 * Manages the Socket.IO connection for InterfaceConfig.
 *
 * Follows the official Socket.IO + React pattern:
 * https://socket.io/how-to/use-with-react
 *
 * The socket instance lives at module level (socket.ts).
 * This hook manages connect/disconnect and event listeners.
 */

interface UseInterfaceConfigSocketParams {
  dispatch: Dispatch<Action>;
  state: InterfaceConfigState;
  awaitingSync: MutableRefObject<boolean>;
  reloadAllData: () => void;
}

interface DeviceUpdateData {
  device_id?: number;
  action?: string;
  object: {
    synchronized: boolean;
    confhash?: string;
  };
}

interface JobUpdateData {
  job_id: number;
  status: string;
  next_job_id?: number;
}

type SocketEventData = DeviceUpdateData & JobUpdateData;

export function useInterfaceConfigSocket({
  dispatch,
  state,
  awaitingSync,
  reloadAllData,
}: UseInterfaceConfigSocketParams): void {
  const { token } = useAuthToken();

  // Keep state accessible to event handlers without stale closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Connect/disconnect based on token
  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Register event listeners
  useEffect(() => {
    function onConnect() {
      socket.emit("events", { update: "device" });
      socket.emit("events", { update: "job" });
    }

    function onEvents(data: SocketEventData) {
      const s = stateRef.current;

      if (
        data.device_id &&
        data.device_id === s.device?.id &&
        data.action === "UPDATED"
      ) {
        handleDeviceUpdate(data as DeviceUpdateData, s);
      } else if (data.job_id) {
        handleJobUpdate(data as JobUpdateData, s);
      }
    }

    function handleDeviceUpdate(
      data: DeviceUpdateData,
      s: InterfaceConfigState,
    ) {
      const updated = data.object;

      if (awaitingSync.current && updated.synchronized) {
        awaitingSync.current = false;
        reloadAllData();
        return;
      }

      dispatch({
        type: actions.DEVICE_UPDATED,
        synchronized: updated.synchronized,
      });

      if (!s.isWorking && updated.confhash !== s.device?.confhash) {
        dispatch({ type: actions.MARK_THIRD_PARTY_UPDATE });
      }
    }

    function handleJobUpdate(data: JobUpdateData, s: InterfaceConfigState) {
      dispatch({ type: actions.JOB_UPDATED, jobData: data });

      // When second job finishes, start awaiting device sync
      const jobs = s.autoPushJobs;
      const isSecondJob = jobs.length === 2 && jobs[1].job_id === data.job_id;
      const stopped = data.status === "FINISHED" || data.status === "EXCEPTION";

      if (isSecondJob && stopped) {
        awaitingSync.current = true;
      }
    }

    socket.on("connect", onConnect);
    socket.on("events", onEvents);

    return () => {
      socket.off("connect", onConnect);
      socket.off("events", onEvents);
    };
  }, [dispatch, awaitingSync, reloadAllData]);
}
