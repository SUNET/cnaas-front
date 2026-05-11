// Table UI surface types shared between the table components, the socket
// hook, and the reducer state.
//
// `types/` is a leaf: nothing here imports from sibling feature directories
// (api/, stores/, hooks/, components/). This prevents import cycles.

import type { DeviceColumnKey } from "./columns";

export type SortDirection = "ascending" | "descending" | null;

/**
 * Active filter values keyed by column. All keys optional — a column without
 * a filter is simply absent from the record.
 */
export type FilterData = Partial<Record<DeviceColumnKey, string>>;
