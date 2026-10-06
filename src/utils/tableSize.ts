type TableSize = "small" | "medium";

export function getTableSize(): TableSize {
  try {
    const raw = globalThis.localStorage?.getItem("tableSizeCompact");
    return raw && JSON.parse(raw) === true ? "small" : "medium";
  } catch {
    return "medium";
  }
}
