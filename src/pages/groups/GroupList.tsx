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
import { useAuthToken } from "../../stores/AuthTokenContext";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { fetchGroups } from "./groupsApi";

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

function GroupTableBody() {
  const [groupData, setGroupData] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { token } = useAuthToken();

  const getGroupsData = async () => {
    try {
      const data = await fetchGroups(token);
      setGroupData(data.groups);
    } catch (err) {
      setGroupData({});
      setError(err instanceof Error ? err : new Error(String(err)));
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
    return <GroupError message={error.message} />;
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
