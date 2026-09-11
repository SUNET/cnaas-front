import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { BadgeButton } from "../../../components/BadgeButton";
import LogViewer from "../../../components/LogViewer";
import { Task } from "../../../components/Task";
import { Tooltip } from "../../../components/Tooltip";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { usePermissions } from "../../../stores/PermissionsContext";
import { matchesJobId } from "../../../types/job";
import { getData } from "../../../utils/getData";
import { putData } from "../../../utils/sendData";
import {
  useConfigChange,
  useConfigChangeDispatch,
} from "../stores/ConfigChangeContext";
import { actions, type RepoName } from "../stores/configChangeReducer";

function filterLogLinesByJobIds(jobIds: number[]) {
  const matchers = jobIds.map((id) => matchesJobId(id));
  return function (logLine: string) {
    return matchers.some((matches) => matches(logLine));
  };
}

type ConfigChangeStep1Props = {
  readonly setRepoWorking: (working: boolean) => void;
  readonly dryRunJobStatus?: string | null;
  readonly onDryRunReady: () => void;
  readonly repoJobs?: number[];
  readonly logLines?: string[];
};

function PrettyCommit({ commitStr }: { readonly commitStr: unknown }) {
  if (typeof commitStr !== "string") {
    if (commitStr == null) return null;
    return <Typography component="div">{JSON.stringify(commitStr)}</Typography>;
  }

  const gitCommitRegex =
    /Commit ([a-z0-9]{8})([a-z0-9]{32}) (\w+) by (.+) at ([0-9:-\s]+)/i;
  const match = gitCommitRegex.exec(commitStr);
  if (!match) return <Typography component="div">{commitStr}</Typography>;

  const commitPopup = (
    <Tooltip title={match[1] + match[2]}>
      <u>{match[1]}</u>
    </Tooltip>
  );
  return (
    <Typography component="div">
      Commit {commitPopup} {match[3]} by {match[4]} at {match[5]}
    </Typography>
  );
}

export function ConfigChangeStep1({
  setRepoWorking,
  dryRunJobStatus,
  onDryRunReady,
  repoJobs = [],
  logLines = [],
}: ConfigChangeStep1Props) {
  const [commitInfo, setCommitInfo] = useState<Record<string, unknown>>({});
  const [commitUpdateInfo, setCommitUpdateInfo] = useState<
    Record<string, string | null>
  >({
    settings: null,
    templates: null,
  });
  const { permissionsCheck } = usePermissions();
  const { token } = useAuthToken();
  const {
    autoDryRunAfterRefresh,
    settingsCommitsBehind,
    templatesCommitsBehind,
  } = useConfigChange();
  const dispatch = useConfigChangeDispatch();

  const buttonsDisabled =
    dryRunJobStatus ||
    commitUpdateInfo.settings === "updating..." ||
    commitUpdateInfo.templates === "updating...";

  function setCommitsBehind(repoName: RepoName, commitsBehind: number | null) {
    dispatch(
      repoName === "settings"
        ? { type: actions.SET_SETTINGS_COMMITS_BEHIND, commitsBehind }
        : { type: actions.SET_TEMPLATES_COMMITS_BEHIND, commitsBehind },
    );
  }

  useEffect(() => {
    async function getRepoStatus(repoName: RepoName) {
      const url = `${process.env.API_URL}/api/v1.0/repository/${repoName}`;
      try {
        const data = await getData(url, token);
        setCommitInfo((prev) => ({ ...prev, [repoName]: data.data }));
        setCommitsBehind(repoName, data.commits_behind ?? null);
      } catch (error) {
        console.error(`Failed to fetch ${repoName} repo status:`, error);
      }
    }
    if (token) {
      getRepoStatus("settings");
      getRepoStatus("templates");
    }
  }, [token]);

  async function refreshRepo(repoName: RepoName) {
    setCommitUpdateInfo((prev) => ({ ...prev, [repoName]: "updating..." }));
    setRepoWorking(true);

    const url = `${process.env.API_URL}/api/v1.0/repository/${repoName}`;
    const dataToSend = { action: "REFRESH" };

    try {
      const data = await putData(url, token, dataToSend);
      const success = data.status === "success";
      setCommitInfo((prev) => ({
        ...prev,
        [repoName]: success ? data.data : data.message,
      }));
      setCommitUpdateInfo((prev) => ({
        ...prev,
        [repoName]: success ? "success" : "error",
      }));
      // The refresh response doesn't include commits_behind (only GET does),
      // but a successful refresh means we just pulled to match origin.
      if (success) {
        setCommitsBehind(repoName, 0);
      }
      return success;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setCommitInfo((prev) => ({ ...prev, [repoName]: message }));
      setCommitUpdateInfo((prev) => ({ ...prev, [repoName]: "error" }));
      return false;
    } finally {
      setRepoWorking(false);
    }
  }

  async function handleRefreshAndDryRun(repoName: RepoName) {
    const success = await refreshRepo(repoName);
    if (success) {
      onDryRunReady();
    } else {
      console.error(`Refresh error occurred for ${repoName}`);
    }
  }

  function handleRefreshSettings() {
    if (autoDryRunAfterRefresh) {
      handleRefreshAndDryRun("settings");
    } else {
      refreshRepo("settings");
    }
  }

  function renderUpdateStatus(status: string | null) {
    if (status === "updating...") {
      return <Typography color="text.secondary">Updating…</Typography>;
    }
    if (status === "success") {
      return (
        <Typography color="success.main">✓ Refreshed successfully</Typography>
      );
    }
    if (status === "error") {
      return <Typography color="error.main">✗ Refresh failed</Typography>;
    }
    return null;
  }

  return (
    <Task
      title={
        <>
          Optional: Refresh repositories (1/4)
          <Tooltip title="Pull latest commits from git repository to NMS server. You can skip this step if you know there are no changes in the git repository.">
            <HelpOutlineOutlinedIcon fontSize="small" />
          </Tooltip>
        </>
      }
    >
      <Stack spacing={2}>
        <Stack spacing={0.25}>
          <Typography component="div" sx={{ fontWeight: "bold" }}>
            Latest settings repo commit:
          </Typography>
          <PrettyCommit commitStr={commitInfo.settings} />
        </Stack>
        <Stack spacing={0.25}>
          <Typography component="div" sx={{ fontWeight: "bold" }}>
            Latest templates repo commit:
          </Typography>
          <PrettyCommit commitStr={commitInfo.templates} />
        </Stack>
      </Stack>

      <Stack spacing={2} sx={{ mt: 4, alignItems: "flex-start" }}>
        <Stack direction="row" spacing={2}>
          <BadgeButton
            badgeCount={settingsCommitsBehind}
            hidden={!permissionsCheck("Config change", "write")}
            disabled={!!buttonsDisabled}
            onClick={handleRefreshSettings}
          >
            Refresh settings
          </BadgeButton>

          <FormControlLabel
            control={
              <Checkbox
                checked={autoDryRunAfterRefresh}
                onChange={(event) =>
                  dispatch({
                    type: actions.SET_AUTO_DRY_RUN_AFTER_REFRESH,
                    enabled: event.target.checked,
                  })
                }
              />
            }
            label="Auto dry run after refresh settings"
          />
        </Stack>
        {renderUpdateStatus(commitUpdateInfo.settings)}

        <BadgeButton
          badgeCount={templatesCommitsBehind}
          hidden={!permissionsCheck("Config change", "write")}
          disabled={!!buttonsDisabled}
          onClick={() => refreshRepo("templates")}
        >
          Refresh templates
        </BadgeButton>
        {renderUpdateStatus(commitUpdateInfo.templates)}
      </Stack>
      <LogViewer logs={logLines.filter(filterLogLinesByJobIds(repoJobs))} />
    </Task>
  );
}
