import { Permission } from "../../types/permission";

const toStringArray = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

/**
 * Validates and normalises permissions received from the API (or any untrusted
 * source) before they are trusted, displayed, or persisted to browser storage.
 *
 * Only the known string-array fields of {@link Permission} are kept, and each
 * is coerced to an array of strings. This strips any unexpected fields and
 * non-string values, so the value written to storage is a freshly constructed,
 * well-typed object rather than the raw (potentially tainted) input.
 *
 * Returns `null` when the input is not an array of permissions.
 */
export const sanitizePermissions = (value: unknown): Permission[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.map((entry) => {
    const source =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    return {
      methods: toStringArray(source.methods),
      endpoints: toStringArray(source.endpoints),
      exclude_endpoints: toStringArray(source.exclude_endpoints),
      pages: toStringArray(source.pages),
      rights: toStringArray(source.rights),
    };
  });
};
