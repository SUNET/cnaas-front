import { findPermission } from "../../contexts/PermissionsContext";

// To be deprecated. This utility is used by class components that dont't have
// access to PermissionsContext.
const permissionsCheck = (page, right) => {
  if (process.env.PERMISSIONS_DISABLED === "true") {
    return true;
  }

  const permissionsStored = localStorage.getItem("permissions");
  if (!permissionsStored) return false;
  try {
    return findPermission(JSON.parse(permissionsStored), page, right);
  } catch {
    return false;
  }
};

export default permissionsCheck;
