/**
 * Permission — a single RBAC permission rule for the logged-in user.
 *
 * Backend source: cnaas_nms.models.permissions.PermissionModel (serialized via
 * `__dict__` by `GET /api/v1.0/auth/permissions`).
 *
 * Every field is an `Optional[list[str]] = []` on the backend, so each arrives
 * as a (possibly empty) list. They are modelled optional here to mirror the
 * defensive access in `findPermission` (`pages?.includes(...)`).
 */
export type Permission = {
  readonly methods?: readonly string[];
  readonly endpoints?: readonly string[];
  readonly exclude_endpoints?: readonly string[];
  readonly pages?: readonly string[];
  readonly rights?: readonly string[];
};
