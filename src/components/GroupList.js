import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import {
  Icon,
  Loader,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { getData } from "../utils/getData";
import permissionsCheck from "../utils/permissions/permissionsCheck";

function GroupLoading() {
  return (
    <TableBody>
      <TableRow key="Loading">
        <TableCell colSpan="5">
          <Loader active inline="centered">
            Loading groups...{" "}
          </Loader>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupError({ message }) {
  return (
    <TableBody>
      <TableRow key="error">
        <TableCell colSpan="5">API error: {message}</TableCell>
      </TableRow>
    </TableBody>
  );
}

GroupError.propTypes = {
  message: PropTypes.string,
};

function GroupEmptyResult() {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan="5">Empty result</TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupResult({ groupData }) {
  return (
    <TableBody>
      {Object.entries(groupData).map(([group, devices]) => (
        <TableRow key={group}>
          <TableCell>{group}</TableCell>
          <TableCell>{devices.join(", ")}</TableCell>

          {permissionsCheck("Groups", "read") && (
            <TableCell>
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
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  );
}

GroupResult.propTypes = {
  groupData: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
};

function GroupTableBody() {
  const [groupData, setGroupData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuthToken();

  const getGroupsData = async () => {
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

  useEffect(() => {
    getGroupsData();
  }, []);

  if (loading) {
    return <GroupLoading />;
  }

  if (error) {
    return <GroupError message={error.message} />;
  }

  if (groupData.length === 0) {
    return <GroupEmptyResult />;
  }

  return <GroupResult groupData={groupData} />;
}

function GroupList() {
  return (
    <section>
      <h2>Groups</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Group name</TableHeaderCell>
            <TableHeaderCell>Group members</TableHeaderCell>
            <TableHeaderCell hidden={!permissionsCheck("Groups", "read")}>
              Actions
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <GroupTableBody />
      </Table>
    </section>
  );
}

export default GroupList;
