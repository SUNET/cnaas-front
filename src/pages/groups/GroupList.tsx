import { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
        <TableCell align="center" colSpan={3}>
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
        <TableCell align="center" colSpan={3}>
          API error: {message}
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function GroupEmptyResult() {
  return (
    <TableBody>
      <TableRow>
        <TableCell align="center" colSpan={3}>
          Empty result
        </TableCell>
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
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group name</TableCell>
              <TableCell>Group members</TableCell>
              <TableCell hidden={!permissionsCheck("Groups", "read")}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <GroupTableBody />
        </Table>
      </TableContainer>
    </section>
  );
}
