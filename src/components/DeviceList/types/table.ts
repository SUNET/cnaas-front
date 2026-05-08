// Table UI surface types shared between the table components, the socket
// hook, and the reducer state.
//
// `types/` is a leaf: nothing here imports from sibling feature directories
// (api/, stores/, hooks/, components/). This prevents import cycles.

export type SortDirection = "ascending" | "descending" | null;

export interface FilterData {
  readonly [key: string]: string;
}
