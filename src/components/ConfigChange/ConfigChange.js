import PropTypes from "prop-types";
import queryString from "query-string";
import { useEffect, useMemo, useRef, useState } from "react";
import { Prompt } from "react-router";
import { Button } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import { getData } from "../../utils/getData";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import ConfigChangeStep4 from "./ConfigChangeStep4";
import { DryRun } from "./DryRun/DryRun";
import SyncStatus from "./SyncStatus";
import VerifyDiff from "./VerifyDiff/VerifyDiff";
import { getSyncHistory, getDeviceList } from "./utils.js";
import { post } from "../../utils/sendData.js";
import { useAuthToken } from "../../contexts/AuthTokenContext.js";
import { io } from "socket.io-client";

import "../../styles/react-semantic-alert.css";
import { useFreshRef } from "../../hooks/useFreshRef.js";
let socket = null;

const STATUS_STOPPED = ["FINISHED", "EXCEPTION", "ABORTED"];
const STATUS_RUNNING = ["RUNNING"];

// Batch sync toast notifications
const pendingHostnames = new Set();
let toastBatchTimer = null;
const BATCH_INTERVAL_MS = 1000;

const showSyncToast = (syncEventHostname) => {
  // Add hostname to the batch
  pendingHostnames.add(syncEventHostname);

  // Clear existing timer if any
  if (toastBatchTimer) {
    clearTimeout(toastBatchTimer);
  }

  // Set new timer to show batched toast after 1 second
  toastBatchTimer = setTimeout(() => {
    const hostnames = Array.from(pendingHostnames);
    if (hostnames.length > 0) {
      const title =
        hostnames.length === 1
          ? `Refresh affected: ${hostnames[0]}`
          : `Refresh affected: ${hostnames.length} devices`;

      toast({
        type: "info",
        icon: "paper plane",
        title,
        time: 2000,
      });

      pendingHostnames.clear();
    }
    toastBatchTimer = null;
  }, BATCH_INTERVAL_MS);
};

// Batch sync warning toast notifications
let pendingSyncWarnings = [];
let syncWarningBatchTimer = null;

const showSyncWarningToast = (data) => {
  // Add sync event data to the batch
  pendingSyncWarnings.push(data);

  // Clear existing timer if any
  if (syncWarningBatchTimer) {
    clearTimeout(syncWarningBatchTimer);
  }

  // Set new timer to show batched toast after 1 second
  syncWarningBatchTimer = setTimeout(() => {
    if (pendingSyncWarnings.length > 0) {
      const count = pendingSyncWarnings.length;
      const title =
        count === 1
          ? `Sync event: ${pendingSyncWarnings[0].syncevent_hostname}`
          : `Multiple sync events`;

      const description =
        count === 1 ? (
          <p>
            {pendingSyncWarnings[0].syncevent_data.cause} by{" "}
            {pendingSyncWarnings[0].syncevent_data.by} <br />
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </p>
        ) : (
          <p>
            {count} sync events from other sessions <br />
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </p>
        );

      toast({
        type: "warning",
        icon: "paper plane",
        title,
        description,
        animation: "bounce",
        time: 0,
      });

      pendingSyncWarnings = [];
    }
    syncWarningBatchTimer = null;
  }, BATCH_INTERVAL_MS);
};

const showAnotherSessionDidRefreshToast = (jobId) => {
  toast({
    type: "warning",
    icon: "paper plane",
    title: `Another session did refresh`,
    description: (
      <p>
        Dry run progress reset because refresh repo job {jobId}
        <br />
        <Link to="/jobs">job log</Link>
      </p>
    ),
    animation: "bounce",
    time: 0,
  });
};

ConfigChange.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string,
  }),
};

function ConfigChange({ location }) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);

  const [blockNavigation, setBlockNavigation] = useState(false);
  const [confirmRunProgressData, setConfirmRunProgressData] = useState({});
  const [devices, setDevices] = useState([]);
  const [dryRunDisable, setDryRunDisable] = useState(false);
  const [dryRunProgressData, setDryRunProgressData] = useState({});
  const [dryRunTotalCount, setDryRunTotalCount] = useState(0);
  const [liveRunProgressData, setLiveRunProgressData] = useState({});
  const [liveRunTotalCount, setLiveRunTotalCount] = useState(0);
  const [logLines, setLogLines] = useState([]);
  const stoppedRepoJobs = useRef([]);
  const [syncHistory, setSyncHistory] = useState({});
  const [synctoForce, setSynctoForce] = useState(false);
  const repoJobIdRef = useRef(null); // null, -1, positive number
  const isRepoRefreshingRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const dryRun = useMemo(() => {
    if (Object.keys(dryRunProgressData).length === 0) {
      return { status: "", results: {}, changeScore: "", jobId: "NA" };
    }

    return {
      status: dryRunProgressData.status,
      changeScore: dryRunProgressData.change_score,
      jobId: dryRunProgressData.id,
      results:
        dryRunProgressData.status === "FINISHED"
          ? dryRunProgressData.result.devices
          : {},
    };
  }, [dryRunProgressData]);

  const liveRun = useMemo(() => {
    if (Object.keys(liveRunProgressData).length === 0) {
      return { status: "", results: "", jobId: "NA" };
    }

    return {
      status: liveRunProgressData.status,
      jobId: liveRunProgressData.id,
      results:
        liveRunProgressData.status === "FINISHED"
          ? liveRunProgressData.result.devices
          : "",
    };
  }, [liveRunProgressData]);

  const confirmRun = useMemo(() => {
    if (Object.keys(confirmRunProgressData).length === 0) {
      return { status: "", jobId: "NA" };
    }

    return {
      status: confirmRunProgressData.status,
      jobId: confirmRunProgressData.id,
    };
  }, [confirmRunProgressData]);

  const allRepoJobs = [...stoppedRepoJobs.current]; // make a copy
  if (repoJobIdRef.current !== null) {
    allRepoJobs.push(repoJobIdRef.current);
  }

  const jobIsCurrentOrPrevious = (jobId) =>
    jobId === repoJobIdRef.current || stoppedRepoJobs.current.includes(jobId);
  const setRepoJobPending = () => {
    repoJobIdRef.current = -1;
  };
  const repoJobIsPending = () => {
    return repoJobIdRef.current === -1;
  };

  const resetState = async () => {
    // initial state
    setBlockNavigation(false);
    setConfirmRunProgressData({});
    setDryRunProgressData({});
    setDryRunTotalCount(0);
    setLiveRunProgressData({});
    setLiveRunTotalCount(0);
    setLogLines([]);
    stoppedRepoJobs.current = [];
    repoJobIdRef.current = null;
    isRepoRefreshingRef.current = false;

    const devices = await getDevices();
    const syncHistory = await getSyncHistoryDevices();
    setDevices(devices);
    setSyncHistory(syncHistory);
    setDryRunDisable(false);
  };

  const handleJobEvent = (data) => {
    if (STATUS_RUNNING.includes(data.status)) {
      if (
        (repoJobIdRef.current === null && isRepoRefreshingRef.current) ||
        repoJobIsPending()
      ) {
        // Job running:  set repoJobId
        repoJobIdRef.current = data.job_id;
      } else if (data.function_name === "refresh_repo") {
        // Another session did doing refresh
        showAnotherSessionDidRefreshToast(data.job_id);
        setDryRunProgressData({});
      }
    }

    if (STATUS_STOPPED.includes(data.status) && repoJobIdRef.current !== null) {
      // Job stopped: update prevRepoJobs and unset repoJobId
      const repoJobId = repoJobIdRef.current;
      stoppedRepoJobs.current.push(repoJobId);
      repoJobIdRef.current = null;
    }
  };

  const handleSyncEvent = (data) => {
    let showWarning = true;
    const eventJobId = data.syncevent_data.job_id;
    if (eventJobId) {
      // repoJob -1 signals we are waiting to get the job id, delay a bit and check repoJob again
      if (repoJobIsPending()) {
        showWarning = false;
        setTimeout(() => {
          if (jobIsCurrentOrPrevious(eventJobId)) {
            showSyncToast(data.syncevent_hostname);
          }
        }, 500);
      } else if (jobIsCurrentOrPrevious(eventJobId)) {
        showWarning = false;
        showSyncToast(data.syncevent_hostname);
      }
    }

    if (showWarning) {
      // someone else did a refresh
      showSyncWarningToast(data);
    }
  };

  // socket
  useEffect(() => {
    socket = io(process.env.API_URL, { query: { jwt: token } });
    socket.on("connect", function () {
      socket.emit("events", { loglevel: "DEBUG" });
      socket.emit("events", { sync: "all" });
      socket.emit("events", { update: "job" });
    });

    socket.on("error", (error) => {
      console.log("SOCKET ERROR", error);
    });

    socket.on("disconnect", (reason, details) => {
      console.log("SOCKET DISCONNECTED", reason, details);
    });

    socket.on("events", (data) => {
      if (data?.job_id) {
        // job events
        handleJobEvent(data);
      } else if (data.syncevent_hostname && data.syncevent_data) {
        // sync events
        handleSyncEvent(data);
      } else if (typeof data === "string" || data instanceof String) {
        // log events
        setLogLines((prev) => {
          const updated = [...prev, `${data}\n`];
          if (updated.length > 1000) {
            updated.shift(); // remove oldest
          }
          return updated;
        });
      }
    });

    return () => {
      if (socket !== null) socket.off("events");
      if (toastBatchTimer) {
        clearTimeout(toastBatchTimer);
        toastBatchTimer = null;
        pendingHostnames.clear();
      }
      if (syncWarningBatchTimer) {
        clearTimeout(syncWarningBatchTimer);
        syncWarningBatchTimer = null;
        pendingSyncWarnings = [];
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const queryParams = queryString.parse(location.search);
    if (queryParams.scrollTo !== undefined) {
      const element = document.getElementById(
        `${queryParams.scrollTo}_section`,
      );
      if (element) {
        element.scrollIntoView({ alignToTop: true, behavior: "smooth" });
      }
    }

    if (queryParams.autoDryRun) {
      handleDryRunReady();
    }

    getDevices().then((devices) => setDevices(devices));
    getSyncHistoryDevices().then((syncHistory) => setSyncHistory(syncHistory));
  }, []);

  useEffect(() => {
    if (blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }, [blockNavigation]);

  const handleDryRunReady = () => {
    const element = document.getElementById("dryrunButton");
    element.scrollIntoView({ block: "start", behavior: "smooth" });
    deviceSyncStart({ resync: false });
  };

  const getCommitTarget = () => {
    const queryParams = queryString.parse(location.search);
    if (queryParams.hostname) {
      return { hostname: queryParams.hostname };
    }
    if (queryParams.group) {
      return { group: queryParams.group };
    }
    return { all: true };
  };

  const getSyncHistoryDevices = async () => {
    return await getSyncHistory(token);
  };

  const getDevices = async () => {
    const target = getCommitTarget();
    return await getDeviceList(token, target);
  };

  const handleRepoRefreshing = async (isRefreshing) => {
    if (isRepoRefreshingRef.current && !isRefreshing) {
      const devices = await getDevices();
      const syncHistory = await getSyncHistoryDevices();
      setDevices(devices);
      setSyncHistory(syncHistory);
    } else {
      if (!repoJobIdRef.current) {
        setRepoJobPending();
      }
    }
    isRepoRefreshingRef.current = isRefreshing;
  };

  const readHeaders = (response, dryRun) => {
    const totalCountHeader = Number(response.headers.get("X-Total-Count"));
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      if (dryRun) {
        setDryRunTotalCount(totalCountHeader);
      } else {
        setLiveRunTotalCount(totalCountHeader);
      }
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
  };

  const deviceSyncStart = async (options = {}) => {
    const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
    const dataToSend = {
      ...getCommitTarget(),
      dry_run: options.dry_run ?? true, // default to true unless explicitly set
      ...(options.resync && { resync: options.resync }),
      ...(options.comment && { comment: options.comment }),
      ...(options.ticket_ref && { ticket_ref: options.ticket_ref }),
      ...(options.confirm_mode >= 0 && { confirm_mode: options.confirm_mode }),
    };

    // Handle force flag
    if (synctoForce) {
      dataToSend.force = true;
    }

    const response = await post(url, tokenRef.current, dataToSend);
    readHeaders(response, dataToSend.dry_run);
    const responseJson = await response.json();

    const pollType = dataToSend.dry_run ? "dry_run" : "live_run";
    pollJobStatus(responseJson.job_id, pollType);

    setDryRunDisable(true);
  };

  const updateJobType = (jobType, payload) => {
    switch (jobType) {
      case "dry_run":
        setDryRunProgressData(payload);
        break;
      case "live_run":
        setLiveRunProgressData(payload);
        break;
      case "confirm_run":
        setConfirmRunProgressData(payload);
        break;
      default:
        throw new Error("pollJobStatus called with unknown jobtype");
    }
  };

  const pollJobStatus = async (jobId, jobType) => {
    const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    setBlockNavigation(true);

    // Set up interval
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await getData(url, tokenRef.current);
        const payload = response.data.jobs[0];
        updateJobType(jobType, payload);

        if (STATUS_STOPPED.includes(payload.status)) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setBlockNavigation(false);

          if (
            jobType === "live_run" &&
            payload.status === "FINISHED" &&
            typeof payload.next_job_id === "number"
          ) {
            pollJobStatus(payload.next_job_id, "confirm_run");
          }
          if (jobType === "live_run") {
            setSynctoForce(false);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setBlockNavigation(false);
      }
    }, 1000);
  };

  return (
    <>
      <Prompt
        when={blockNavigation}
        message="A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave."
      />
      <SemanticToastContainer position="top-right" maxToasts={3} />
      <section>
        <SyncStatus
          devices={devices}
          synchistory={syncHistory}
          target={getCommitTarget()}
        />
        <ConfigChangeStep1
          dryRunJobStatus={dryRun.status}
          setRepoWorking={(bool) => handleRepoRefreshing(bool)}
          onDryRunReady={() => handleDryRunReady()}
          repoJobs={allRepoJobs}
          logLines={logLines}
        />
        <DryRun
          dryRunDisable={dryRunDisable}
          dryRunSyncStart={deviceSyncStart}
          dryRunProgressData={dryRunProgressData}
          dryRunJobStatus={dryRun.status}
          jobId={dryRun.jobId}
          devices={dryRun.results}
          totalCount={dryRunTotalCount}
          logLines={logLines}
          resetState={resetState}
          repoWorkingState={isRepoRefreshingRef.current}
          synctoForce={synctoForce}
          setSynctoForce={setSynctoForce}
        />
        <VerifyDiff
          dryRunChangeScore={dryRun.changeScore}
          devices={dryRun.results}
        />
        <ConfigChangeStep4
          liveRunSyncStart={deviceSyncStart}
          liveRunProgressData={liveRunProgressData}
          liveRunJobStatus={liveRun.status}
          dryRunJobStatus={dryRun.status}
          jobId={liveRun.jobId}
          confirmRunProgressData={confirmRunProgressData}
          confirmRunJobStatus={confirmRun.status}
          confirmJobId={confirmRun.jobId}
          devices={liveRun.results}
          totalCount={liveRunTotalCount}
          logLines={logLines}
          dryRunChangeScore={dryRun.changeScore}
          synctoForce={synctoForce}
        />
      </section>
    </>
  );
}

export default ConfigChange;
