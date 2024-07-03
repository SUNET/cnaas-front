import React, { useEffect, useState } from "react";
import { Icon, Popup } from "semantic-ui-react";
import PropTypes from "prop-types";
import { getData } from "../../utils/getData";
import permissionsCheck from "../../utils/permissions/permissionsCheck";
import { putData } from "../../utils/sendData";

function ConfigChangeStep1({
  setRepoWorking,
  dryRunJobStatus,
  onDryRunReady,
  repoJobs,
  logLines,
}) {
  const [commitInfo, setCommitInfo] = useState({});
  const [commitUpdateInfo, setCommitUpdateInfo] = useState({
    settings: null,
    templates: null,
  });
  const [triggerDryRun, setTriggerDryRun] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  useEffect(() => {
    setButtonsDisabled(
      dryRunJobStatus ||
        commitUpdateInfo.settings === "updating..." ||
        commitUpdateInfo.templates === "updating...",
    );
  }, [commitUpdateInfo, dryRunJobStatus]);

  useEffect(() => {
    async function getRepoStatus(repoName) {
      const credentials = localStorage.getItem("token");
      const url = `${process.env.API_URL}/api/v1.0/repository/${repoName}`;

      getData(url, credentials).then((data) => {
        setCommitInfo((prev) => ({ ...prev, [repoName]: data.data }));
      });
    }
    getRepoStatus("settings");
    getRepoStatus("templates");
  }, []);

  useEffect(() => {
    if (!triggerDryRun) {
      return;
    }
    if (commitUpdateInfo.settings === "success") {
      onDryRunReady();
    } else {
      console.log(
        `Refresh error occured. Status${JSON.stringify(commitUpdateInfo)}`,
      );
    }

    setTriggerDryRun(false);
  }, [commitUpdateInfo, onDryRunReady, triggerDryRun]);

  // function that returns a function that filters the log lines to only return ones which includes any of the specified job ids
  function checkJobIds(jobIds) {
    return function filterLogLines(logLine) {
      return jobIds.some((v) => logLine.toLowerCase().includes(`job #${v}`))
        ? logLine
        : null;
    };
  }

  // this request takes some time, perhaps work in a "loading..."
  async function refreshRepo(repoName) {
    setCommitUpdateInfo((prev) => ({ ...prev, [repoName]: "updating..." }));
    await setRepoWorking(true);

    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/repository/${repoName}`;
    const dataToSend = { action: "REFRESH" };

    return putData(url, credentials, dataToSend)
      .then((data) => {
        if (data.status === "success") {
          setRepoWorking(false);
        }
        setCommitInfo((prev) => ({
          ...prev,
          [repoName]: data.status === "success" ? data.data : data.message,
        }));
        setCommitUpdateInfo((prev) => ({
          ...prev,
          [repoName]: data.status === "success" ? "success" : "error",
        }));
      })
      .catch((error) => {
        setCommitInfo((prev) => ({ ...prev, [repoName]: error.message }));
        setCommitUpdateInfo((prev) => ({ ...prev, [repoName]: "error" }));
      });
  }

  function handleRefreshAndDryRun(repoName) {
    refreshRepo(repoName).then(() => setTriggerDryRun(true));
  }

  function prettifyCommit(commitStr) {
    // const p = 'Commit addce6b8e7e62fbf0e6cf0adf6c05ccdab5fe24d master by Johan Marcusson at 2020-11-30 10:55:54+01:00';
    const gitCommitRegex =
      /Commit ([a-z0-9]{8})([a-z0-9]{32}) (\w+) by (.+) at ([0-9:-\s]+)/i;
    const match = gitCommitRegex.exec(commitStr);
    try {
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
    } catch (err) {
      return <p>{commitStr}</p>;
    }
  }

  let log = "";
  if (logLines !== undefined && logLines.length > 0) {
    logLines.filter(checkJobIds(repoJobs)).forEach((logLine) => {
      log += logLine;
      const element = document.getElementById(`logoutputdiv_refreshrepo`);
      if (element !== null) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  return (
    <div className="task-container">
      <div className="heading">
        <h2>
          <Icon
            name="dropdown"
            onClick={() => setExpanded((prev) => !prev)}
            rotated={expanded ? null : "counterclockwise"}
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
            disabled={buttonsDisabled}
            onClick={() => refreshRepo("settings")}
          >
            Refresh settings
          </button>
          <button
            type="button"
            hidden={!permissionsCheck("Config change", "write")}
            disabled={buttonsDisabled}
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
            disabled={buttonsDisabled}
            onClick={() => refreshRepo("templates")}
          >
            Refresh templates
          </button>
          <p>{commitUpdateInfo.templates}</p>
        </div>
        <div id="logoutputdiv_refreshrepo" className="logoutput">
          <pre>{log}</pre>
        </div>
      </div>
    </div>
  );
}

ConfigChangeStep1.propTypes = {
  setRepoWorking: PropTypes.func.isRequired,
  dryRunJobStatus: PropTypes.string,
  onDryRunReady: PropTypes.func.isRequired,
  repoJobs: PropTypes.arrayOf(PropTypes.number),
  logLines: PropTypes.arrayOf(PropTypes.string),
};

ConfigChangeStep1.defaultProps = {
  dryRunJobStatus: null,
  repoJobs: [],
  logLines: [],
};

export default ConfigChangeStep1;
