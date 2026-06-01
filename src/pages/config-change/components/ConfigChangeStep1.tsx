import { useEffect, useState } from "react";
import { Icon, Popup } from "semantic-ui-react";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { usePermissions } from "../../../stores/PermissionsContext";
import { getData } from "../../../utils/getData";
import { putData } from "../../../utils/sendData";
import { matchesJobId } from "../../../types/job";
import LogViewer from "../../../components/LogViewer";

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
  const [expanded, setExpanded] = useState(true);
  const { permissionsCheck } = usePermissions();
  const { token } = useAuthToken();

  const buttonsDisabled =
    dryRunJobStatus ||
    commitUpdateInfo.settings === "updating..." ||
    commitUpdateInfo.templates === "updating...";

  useEffect(() => {
    async function getRepoStatus(repoName: string) {
      const url = `${process.env.API_URL}/api/v1.0/repository/${repoName}`;
      try {
        const data = await getData(url, token);
        setCommitInfo((prev) => ({ ...prev, [repoName]: data.data }));
      } catch (error) {
        console.error(`Failed to fetch ${repoName} repo status:`, error);
      }
    }
    if (token) {
      getRepoStatus("settings");
      getRepoStatus("templates");
    }
  }, [token]);

  async function refreshRepo(repoName: string) {
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

  async function handleRefreshAndDryRun(repoName: string) {
    const success = await refreshRepo(repoName);
    if (success) {
      onDryRunReady();
    } else {
      console.error(`Refresh error occurred for ${repoName}`);
    }
  }

  function prettifyCommit(commitStr: unknown) {
    if (typeof commitStr !== "string") {
      if (commitStr == null) return <p />;
      return <p>{JSON.stringify(commitStr)}</p>;
    }

    const gitCommitRegex =
      /Commit ([a-z0-9]{8})([a-z0-9]{32}) (\w+) by (.+) at ([0-9:-\s]+)/i;
    const match = gitCommitRegex.exec(commitStr);
    if (!match) return <p>{commitStr}</p>;
    const commitPopup = (
      <Popup
        content={match[1] + match[2]}
        position="top center"
        hoverable
        trigger={<u>{match[1]}</u>}
      />
    );
    return (
      <p>
        Commit {commitPopup} {match[3]} by {match[4]} at {match[5]}
      </p>
    );
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2 id="refreshrepo_section">
          <Icon
            name="dropdown"
            onClick={() => setExpanded((prev) => !prev)}
            rotated={expanded ? undefined : "counterclockwise"}
          />
          Optional: Refresh repositories (1/4)
          <Popup
            content="Pull latest commits from git repository to NMS server. You can skip this step if you know there are no changes in the git repository."
            trigger={<Icon name="question circle outline" size="small" />}
            wide
          />
        </h2>
      </div>
      <div className="task-collapsable" hidden={!expanded}>
        <div className="info">
          <p>Latest settings repo commit: </p>
          {prettifyCommit(commitInfo.settings)}
        </div>
        <div className="info">
          <p>Latest templates repo commit: </p>
          {prettifyCommit(commitInfo.templates)}
        </div>
        <div className="info">
          <button
            type="button"
            hidden={!permissionsCheck("Config change", "write")}
            disabled={!!buttonsDisabled}
            onClick={() => refreshRepo("settings")}
          >
            Refresh settings
          </button>
          <button
            type="button"
            hidden={!permissionsCheck("Config change", "write")}
            disabled={!!buttonsDisabled}
            onClick={() => handleRefreshAndDryRun("settings")}
          >
            Refresh settings + dry run
          </button>
          <p>{commitUpdateInfo.settings}</p>
        </div>
        <div className="info">
          <button
            type="button"
            hidden={!permissionsCheck("Config change", "write")}
            disabled={!!buttonsDisabled}
            onClick={() => refreshRepo("templates")}
          >
            Refresh templates
          </button>
          <p>{commitUpdateInfo.templates}</p>
        </div>
        <LogViewer logs={logLines.filter(filterLogLinesByJobIds(repoJobs))} />
      </div>
    </div>
  );
}
