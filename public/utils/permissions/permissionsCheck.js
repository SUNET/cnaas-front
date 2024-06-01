import { getData } from "../getData";

const findPermission = (userPermissions, targetPage, requiredRight) => {
  // check per permission if the page and rights request are in there

  // eslint-disable-next-line no-restricted-syntax
  for (const permission of userPermissions) {
    const { pages } = permission;
    const { rights } = permission;
    if (
      (pages?.includes("*") || pages?.includes(targetPage)) &&
      (rights?.includes("*") || rights?.includes(requiredRight))
    ) {
      return true;
    }
  }

  return false;
};

const permissionsCheck = (page, right) => {
  if (process.env.PERMISSIONS_DISABLED === "true") {
    return true;
  }

  // check permissions in local storage
  const permissions = localStorage.getItem("permissions");
  if (permissions) {
    return findPermission(JSON.parse(permissions), page, right);
  }

  // else check and set permissions via token
  const token = localStorage.getItem("token");
  if (token?.length === 0) {
    return false;
  }
  getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token)
    .then((data) => {
      localStorage.setItem("permissions", JSON.stringify(data));
      if (!data?.length === 0) {
        return findPermission(data, page, right);
      }
      return false;
    })
    .catch((error) => {
      console.log(error);
      return false;
    });

  return false;
};

export default permissionsCheck;
