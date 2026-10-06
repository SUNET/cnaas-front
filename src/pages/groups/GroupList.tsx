import { useEffect, useState } from "react";
import { getTableSize } from "../../utils/tableSize";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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

function GroupRow({
  group,
  groupData,
}: {
  readonly group: string;
  readonly groupData: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow key={group} onClick={() => setOpen((prev) => !prev)}>
        <TableCell>
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <label>
              {open ? (
                <KeyboardArrowDownIcon sx={{ verticalAlign: "middle" }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ verticalAlign: "middle" }} />
              )}
              {group}
            </label>
            <Stack direction="row">
              {permissionsCheck("Config change", "write") && (
                <a
                  href={`/config-change?group=${group}`}
                  title="Go to config change/sync page"
                >
                  <SyncIcon sx={{ verticalAlign: "middle" }} /> Sync...
                </a>
              )}
              {permissionsCheck("Firmware", "write") && (
                <a
                  href={`/firmware-upgrade?group=${group}`}
                  title="Go to firmware upgrade page"
                >
                  <MemoryIcon sx={{ verticalAlign: "middle" }} /> Firmware
                  upgrade...
                </a>
              )}
            </Stack>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={3}
          sx={{
            py: 0,
            borderBottom: open ? undefined : 0,
          }}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                my: 1.5,
              }}
            >
              <Typography variant="overline">Group members</Typography>
              <Box>
                {(groupData[group] ?? []).map((member) => (
                  <Chip
                    key={member}
                    label={member}
                    size="small"
                    variant="outlined"
                    component="a"
                    href={`/devices?filter[hostname]=${member}`}
                    clickable
                  />
                ))}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function GroupResult({
  groupData,
}: {
  readonly groupData: Record<string, string[]>;
}) {
  return (
    <TableBody>
      {Object.entries(groupData).map(([group]) => (
        <GroupRow key={group} group={group} groupData={groupData} />
      ))}
    </TableBody>
  );
}

function GroupTableBody() {
  const [groupData, setGroupData] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuthToken();

  useEffect(() => {
    let cancelled = false;
    async function getGroupsData() {
      try {
        const data = await fetchGroups(token);
        if (!cancelled) setGroupData(data.groups);
      } catch (err) {
        if (!cancelled) {
          setGroupData({});
          setError(extractErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    getGroupsData();
    return () => {
      cancelled = true;
    };
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
        <Table aria-label="Groups" size={getTableSize()}>
          <TableHead>
            <TableRow>
              <TableCell>Group name</TableCell>
            </TableRow>
          </TableHead>
          <GroupTableBody />
        </Table>
      </TableContainer>
    </section>
  );
}
