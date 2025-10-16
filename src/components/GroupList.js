import { useEffect, useState } from "react";
import { Icon } from "semantic-ui-react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { getData } from "../utils/getData";
import permissionsCheck from "../utils/permissions/permissionsCheck";

function GroupTableBody() {
  const [groupData, setGroupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuthToken();

  useEffect(() => {
    getGroupsData();
  }, []);

  const getGroupsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filter part of the URL to only return specific devices from the API
      // TODO: filterValue should probably be urlencoded?
      const data = await getData(
        `${process.env.API_URL}/api/v1.0/groups`,
        token,
      );
      setGroupData(data.data.groups);
      setLoading(false);
    } catch (error) {
      setGroupData([]);
      setError(error);
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <tbody>
        <tr key="Loading">
          <td colSpan="5">
            <Icon name="spinner" loading />
            Loading groups...
          </td>
        </tr>
      </tbody>
    );
  }

  if (error) {
    return (
      <tbody>
        <tr key="error">
          <td colSpan="5">API error: {error.message}</td>
        </tr>
      </tbody>
    );
  }

  if (groupData.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan="5">Empty result</td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {Object.entries(groupData).map(([group, devices]) => (
        <tr key={group}>
          <td>{group}</td>
          <td>{devices.join(", ")}</td>

          {permissionsCheck("Groups", "read") && (
            <td>
              <div>
                {permissionsCheck("Config change", "write") && (
                  <a
                    href={`/config-change?group=${group}`}
                    title="Go to config change/sync page"
                  >
                    <Icon name="sync" /> Sync...
                  </a>
                )}
                <br />
                {permissionsCheck("Firmware", "write") && (
                  <a
                    href={`/firmware-upgrade?group=${group}`}
                    title="Go to firmware upgrade page"
                  >
                    <Icon name="microchip" /> Firmware upgrade...
                  </a>
                )}
              </div>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
}

function GroupList() {
  return (
    <section>
      <div id="group_list">
        <h2>Group list</h2>
        <div id="data">
          <table>
            <thead>
              <tr>
                <th>Group name</th>
                <th>Group members</th>
                <th hidden={!permissionsCheck("Groups", "read")}>Actions</th>
              </tr>
            </thead>
            <GroupTableBody />
          </table>
        </div>
        <div />
      </div>
    </section>
  );
}

export default GroupList;
