import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { useAuthToken } from "../../../stores/AuthTokenContext";
import {
  buildInitialState,
  deviceListReducer,
  type Action,
  type DeviceListState,
  type InitialSettings,
  type StoredSettings,
} from "./deviceListReducer";
import type { FilterData } from "../types/table";
import { useDeviceListSocket } from "../hooks/useDeviceListSocket";

type DeviceListContextValue = {
  readonly state: DeviceListState;
  readonly dispatch: Dispatch<Action>;
};

const DeviceListContext = createContext<DeviceListContextValue | null>(null);

export function useDeviceList(): DeviceListContextValue {
  const ctx = useContext(DeviceListContext);
  if (ctx == null) {
    throw new Error("useDeviceList must be used within DeviceListProvider");
  }
  return ctx;
}

/**
 * Side-channel context for page-level callbacks that the reducer can't own
 * because they touch URL state, paging, and sort orchestration. Provided
 * by <DeviceList> so descendants (expanded leaves, action hook) can call
 * them without prop-drilling.
 */
export type DeviceListPageActions = {
  readonly handleFilterChange: (
    nextFilterData: FilterData,
    expandDeviceId?: number | null,
  ) => void;
};

const DeviceListPageActionsContext =
  createContext<DeviceListPageActions | null>(null);

export function useDeviceListPageActions(): DeviceListPageActions {
  const ctx = useContext(DeviceListPageActionsContext);
  if (ctx == null) {
    throw new Error(
      "useDeviceListPageActions must be used within DeviceListPageActionsProvider",
    );
  }
  return ctx;
}

export function DeviceListPageActionsProvider({
  value,
  children,
}: {
  readonly value: DeviceListPageActions;
  readonly children: ReactNode;
}) {
  return (
    <DeviceListPageActionsContext.Provider value={value}>
      {children}
    </DeviceListPageActionsContext.Provider>
  );
}

type ProviderProps = {
  readonly initialSettings: InitialSettings;
  // Routing callbacks the reducer doesn't own.
  readonly onGoToDevice: (deviceId: number) => void;
  readonly onFilteredDeviceDeleted: () => void;
  readonly children: ReactNode;
};

export function DeviceListProvider({
  initialSettings,
  onGoToDevice,
  onFilteredDeviceDeleted,
  children,
}: ProviderProps) {
  const { token } = useAuthToken();
  const [state, dispatch] = useReducer(
    deviceListReducer,
    initialSettings,
    buildInitialState,
  );

  useDeviceListSocket(token, state.filterData, dispatch, {
    onGoToDevice,
    onFilteredDeviceDeleted,
  });

  // Persist UI prefs that survive reload. filterData/filterActive are
  // derived from the URL on mount and not persisted here.
  useEffect(() => {
    const payload: StoredSettings = {
      sortColumn: state.sortColumn,
      sortDirection: state.sortDirection,
      activePage: state.activePage,
      activeColumns: state.activeColumns,
      resultsPerPage: state.resultsPerPage,
    };
    localStorage.setItem("deviceList", JSON.stringify(payload));
  }, [
    state.sortColumn,
    state.sortDirection,
    state.activePage,
    state.activeColumns,
    state.resultsPerPage,
  ]);

  const value = useMemo(
    (): DeviceListContextValue => ({ state, dispatch }),
    [state],
  );

  return (
    <DeviceListContext.Provider value={value}>
      {children}
    </DeviceListContext.Provider>
  );
}
