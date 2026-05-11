import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { COLUMN_MAP, isDeviceColumnKey } from "./types/columns";
import type { DeviceColumnKey } from "./types/columns";
import { DeviceListProvider } from "./stores/DeviceListContext";
import type {
  InitialSettings,
  StoredSettings,
} from "./stores/deviceListReducer";
import type { FilterData } from "./types/table";
import { DeviceList } from "./components/DeviceList";

const DEFAULT_ACTIVE_COLUMNS: readonly DeviceColumnKey[] = [
  "id",
  "hostname",
  "device_type",
  "state",
  "synchronized",
];
const DEFAULT_RESULTS_PER_PAGE = 20;

function readStoredSettings(): StoredSettings {
  try {
    return JSON.parse(localStorage.getItem("deviceList") || "{}");
  } catch (error) {
    console.warn("Failed to parse localStorage deviceList settings:", error);
    return {};
  }
}

function parseUrlFilters(searchParams: URLSearchParams): FilterData {
  const filterData: Partial<Record<DeviceColumnKey, string>> = {};
  for (const [key, value] of searchParams.entries()) {
    const match = /^filter\[(.+)\]$/.exec(key);
    if (match && isDeviceColumnKey(match[1])) {
      filterData[match[1]] = value;
    }
  }
  return filterData;
}

// Merge default columns + stored columns + filter keys (URL + persisted),
// dedupe, then order by COLUMN_MAP definition order.
function buildActiveColumns(
  storedColumns: readonly string[] | undefined,
  storedFilterKeys: readonly string[],
  urlFilterKeys: readonly string[],
): readonly DeviceColumnKey[] {
  const validKeys = new Set(Object.keys(COLUMN_MAP));
  const isColumnKey = (key: string): key is DeviceColumnKey =>
    validKeys.has(key);
  const merged = new Set<DeviceColumnKey>([
    ...DEFAULT_ACTIVE_COLUMNS,
    ...(storedColumns ?? []).filter(isColumnKey),
    ...storedFilterKeys.filter(isColumnKey),
    ...urlFilterKeys.filter(isColumnKey),
  ]);
  const order = Object.keys(COLUMN_MAP);
  return [...merged].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function buildInitialSettings(searchParams: URLSearchParams): InitialSettings {
  const stored = readStoredSettings();
  const urlFilterData = parseUrlFilters(searchParams);
  const hasUrlFilters = Object.keys(urlFilterData).length > 0;

  // URL filters take precedence over any persisted filterData.
  // (Stored filterData is read only to keep its keys visible in activeColumns.)
  return {
    filterData: urlFilterData,
    filterActive: hasUrlFilters,
    sortColumn: stored.sortColumn ?? null,
    sortDirection: stored.sortDirection ?? null,
    // Reset to page 1 if URL filters are present (filtering changes results).
    activePage: hasUrlFilters ? 1 : (stored.activePage ?? 1),
    activeColumns: buildActiveColumns(
      stored.activeColumns,
      [],
      Object.keys(urlFilterData),
    ),
    resultsPerPage: stored.resultsPerPage ?? DEFAULT_RESULTS_PER_PAGE,
  };
}

export function DeviceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mount-only; URL changes are handled by DeviceList via SET_FILTER actions.
  const [initialSettings] = useState(() => buildInitialSettings(searchParams));

  // Socket toast "Go to device" — navigate to the devices route filtered by id.
  const onGoToDevice = useCallback(
    (deviceId: number) => {
      navigate(`/devices?filter[id]=${deviceId}`);
      globalThis.scrollTo(0, 0);
    },
    [navigate],
  );

  // URL path part of the "filtered device was deleted" cleanup.
  // When the socket reports the device matching the current URL filter has
  // been deleted, useDeviceListSocket calls this to drop the URL filter and
  // immediately dispatches CLEAR_FILTER_AND_SORT to drop the matching
  // reducer state.
  const onFilteredDeviceDeleted = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <DeviceListProvider
      initialSettings={initialSettings}
      onGoToDevice={onGoToDevice}
      onFilteredDeviceDeleted={onFilteredDeviceDeleted}
    >
      <DeviceList />
    </DeviceListProvider>
  );
}
