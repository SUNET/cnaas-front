import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import CircularProgress from "@mui/material/CircularProgress";
import SyncIcon from "@mui/icons-material/Sync";
import MemoryIcon from "@mui/icons-material/Memory";
import { useAuthToken } from "../../stores/AuthTokenContext";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { extractErrorMessage } from "../../utils/extractErrorMessage";
import { fetchGroups } from "./groupsApi";

function GroupLoading() {
  return (
    <TableBody>
      <TableRow key="Loading">
        <TableCell colSpan="5">
          <CircularProgress size="1em" /> Loading groups...
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupError({ message }: { readonly message: string }) {
  return (
    <TableBody>
      <TableRow key="error">
        <TableCell colSpan="5">API error: {message}</TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupEmptyResult() {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan="5">Empty result</TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupResult({
  groupData,
}: {
  readonly groupData: Record<string, string[]>;
}) {
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
                    <SyncIcon sx={{ verticalAlign: "middle" }} /> Sync...
                  </a>
                )}
                <br />
                {permissionsCheck("Firmware", "write") && (
                  <a
                    href={`/firmware-upgrade?group=${group}`}
                    title="Go to firmware upgrade page"
                  >
                    <MemoryIcon sx={{ verticalAlign: "middle" }} /> Firmware
                    upgrade...
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

function GroupTableBody() {
  const [groupData, setGroupData] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuthToken();

  const getGroupsData = async () => {
    try {
      const data = await fetchGroups(token);
      setGroupData(data.groups);
    } catch (err) {
      setGroupData({});
      setError(extractErrorMessage(err));
    } finally {
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
    return <GroupError message={error} />;
  }

  if (Object.keys(groupData).length === 0) {
    return <GroupEmptyResult />;
  }

  return <GroupResult groupData={groupData} />;
}

export function GroupList() {
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
