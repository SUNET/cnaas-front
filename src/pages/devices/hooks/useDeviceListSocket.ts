import { useEffect, useRef, type Dispatch } from "react";

import type { Device } from "../../../types/device";
import { useFreshRef } from "../../../hooks/useFreshRef";
import { socket } from "../stores/socket";
import { actions, type Action } from "../stores/deviceListReducer";
import type { FilterData } from "../types/table";
import {
  showDeviceDiscoveredToast,
  showDeviceCreatedToast,
} from "../components/toasts";
import { formatJobLogLine } from "../utils";

type DeviceEvent = {
  readonly device_id: number;
  readonly hostname: string;
  readonly action: "UPDATED" | "DELETED" | "CREATED";
  readonly object: Device;
};

type JobEvent = {
  readonly job_id: number;
  readonly status: string;
  readonly exception?: string;
  readonly next_job_id?: number;
};

type EventData = DeviceEvent | JobEvent | string;

function isDeviceEvent(data: EventData): data is DeviceEvent {
  return data != null && typeof data === "object" && "device_id" in data;
}

function isJobEvent(data: EventData): data is JobEvent {
  return data != null && typeof data === "object" && "job_id" in data;
}

type SocketCallbacks = {
  // Invoked when a toast's "Go to device" button is clicked
  readonly onGoToDevice: (deviceId: number) => void;
  // Invoked when the currently filtered device is deleted; component clears
  // its UI-level filter state (URL params, active page) before the reducer
  // CLEAR_FILTER_AND_SORT runs
  readonly onFilteredDeviceDeleted: () => void;
};

export function useDeviceListSocket(
  token: string | null,
  filterData: FilterData,
  dispatch: Dispatch<Action>,
  callbacks: SocketCallbacks,
): void {
  // Fresh refs let socket handlers see latest values without re-subscribing.
  const filterDataRef = useFreshRef(filterData);
  // Stable Set across renders — using useFreshRef would replace it every
  // render, defeating the discovered-id de-duplication.
  const discoveredIdsRef = useRef<Set<number>>(new Set());
  const callbacksRef = useFreshRef(callbacks);

  useEffect(() => {
    if (!token) return;

    socket.io.opts.query = { jwt: token };

    const handleConnect = () => {
      socket.emit("events", { update: "device" });
      socket.emit("events", { update: "job" });
      socket.emit("events", { loglevel: "DEBUG" });
    };

    const handleDeviceEvent = (data: DeviceEvent) => {
      if (data.action === "UPDATED") {
        if (
          data.object.state === "DISCOVERED" &&
          !discoveredIdsRef.current.has(data.device_id)
        ) {
          discoveredIdsRef.current.add(data.device_id);
          showDeviceDiscoveredToast(data, callbacksRef.current.onGoToDevice);
        }
        dispatch({
          type: actions.UPDATE_DEVICE,
          deviceId: data.device_id,
          device: data.object,
        });
      } else if (data.action === "DELETED") {
        dispatch({
          type: actions.MARK_DEVICE_DELETED,
          deviceId: data.device_id,
        });
        if (filterDataRef.current.id === String(data.device_id)) {
          callbacksRef.current.onFilteredDeviceDeleted();
          dispatch({ type: actions.CLEAR_FILTER_AND_SORT });
        }
      } else if (data.action === "CREATED") {
        showDeviceCreatedToast(data, callbacksRef.current.onGoToDevice);
        // The new device might belong in the current view (filter+page);
        // trigger a refetch so the table reflects backend reality. The
        // toast already lets users jump straight to it.
        dispatch({ type: actions.REQUEST_REFETCH });
      }
    };

    const handleJobEvent = (data: JobEvent) => {
      const line = formatJobLogLine(data.job_id, data.status, data.exception);
      dispatch({ type: actions.APPEND_LOG, line });

      if (typeof data.next_job_id === "number") {
        dispatch({
          type: actions.CHAIN_DEVICE_NEXT_JOB,
          jobId: data.job_id,
          nextJobId: data.next_job_id,
        });
      }
    };

    const handleEvents = (data: EventData) => {
      if (isDeviceEvent(data)) {
        handleDeviceEvent(data);
      } else if (isJobEvent(data)) {
        handleJobEvent(data);
      } else if (typeof data === "string") {
        dispatch({ type: actions.APPEND_LOG, line: `${data}\n` });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("events", handleEvents);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("events", handleEvents);
      socket.disconnect();
    };
  }, [token, dispatch, discoveredIdsRef, filterDataRef, callbacksRef]);
}
