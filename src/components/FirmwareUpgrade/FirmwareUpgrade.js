import { useState, useEffect, useRef, useCallback } from "react";
import { Prompt } from "react-router";
import PropTypes from "prop-types";
import queryString from "query-string";
import { Input } from "semantic-ui-react";
import FirmwareStep1 from "./FirmwareStep1";
import FirmwareStep2 from "./FirmwareStep2";
import FirmwareStep3 from "./FirmwareStep3";
import checkResponseStatus from "../../utils/checkResponseStatus";
import { getData } from "../../utils/getData";

const io = require("socket.io-client");

function FirmwareUpgrade({ location }) {
  const [step2totalCount, setStep2TotalCount] = useState(0);
  const [step2jobId, setStep2JobId] = useState(null);
  const [step2jobStatus, setStep2JobStatus] = useState(null);
  const [step2jobResult, setStep2JobResult] = useState(null);
  const [step2finishedDevices, setStep2FinishedDevices] = useState([]);
  const [step2jobData, setStep2JobData] = useState(null);
  const [step3totalCount, setStep3TotalCount] = useState(0);
  const [step3jobId, setStep3JobId] = useState(null);
  const [step3jobStatus, setStep3JobStatus] = useState(null);
  const [step3jobResult, setStep3JobResult] = useState(null);
  const [step3finishedDevices, setStep3FinishedDevices] = useState([]);
  const [step3jobData, setStep3JobData] = useState(null);
  const [activateStep3, setActivateStep3] = useState(false);
  const [filename, setFilename] = useState(null);
  const [job_comment, setJobComment] = useState("");
  const [job_ticket_ref, setJobTicketRef] = useState("");
  const [logLines, setLogLines] = useState([]);
  const [blockNavigation, setBlockNavigation] = useState(false);

  const socketRef = useRef(null);
  const repeatingStep2intervalRef = useRef(null);
  const repeatingStep3intervalRef = useRef(null);

  const updateComment = useCallback((e) => {
    const val = e.target.value;
    setJobComment(val);
  }, []);

  const updateTicketRef = useCallback((e) => {
    const val = e.target.value;
    setJobTicketRef(val);
  }, []);

  const skipStep2 = useCallback(() => {
    setActivateStep3(true);
  }, []);

  const getCommitTarget = useCallback(() => {
    const queryParams = queryString.parse(location.search);
    if (queryParams.hostname !== undefined) {
      return { hostname: queryParams.hostname };
    }
    if (queryParams.group !== undefined) {
      return { group: queryParams.group };
    }
    return null;
  }, [location.search]);

  const getCommitTargetName = useCallback((target) => {
    if (target.hostname !== undefined) {
      return `hostname: ${target.hostname}`;
    }
    if (target.group !== undefined) {
      return `group: ${target.group}`;
    }
    return "unknown";
  }, []);

  const pollJobStatus = useCallback((job_id, step) => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/job/${job_id}`;

    if (step == 2) {
      getData(url, credentials).then((data) => {
        {
          setStep2JobStatus(data.data.jobs[0].status);
          setStep2JobResult(data.data.jobs[0].result);
          setStep2FinishedDevices(data.data.jobs[0].finished_devices);
          setStep2JobData(data.data.jobs[0]);
          setBlockNavigation(true);
        }
      });
      repeatingStep2intervalRef.current = setInterval(() => {
        const credentials = localStorage.getItem("token");
        getData(url, credentials).then((data) => {
          {
            setStep2JobStatus(data.data.jobs[0].status);
            setStep2JobResult(data.data.jobs[0].result);
            setStep2FinishedDevices(data.data.jobs[0].finished_devices);
            setStep2JobData(data.data.jobs[0]);
            if (
              data.data.jobs[0].status === "FINISHED" ||
              data.data.jobs[0].status === "EXCEPTION" ||
              data.data.jobs[0].status === "ABORTED"
            ) {
              clearInterval(repeatingStep2intervalRef.current);
              setActivateStep3(true);
              setBlockNavigation(false);
            }
          }
        });
      }, 5000);
    } else if (step == 3) {
      getData(url, credentials).then((data) => {
        {
          setStep3JobStatus(data.data.jobs[0].status);
          setStep3JobResult(data.data.jobs[0].result);
          setStep3FinishedDevices(data.data.jobs[0].finished_devices);
          setStep3JobData(data.data.jobs[0]);
          setBlockNavigation(true);
        }
      });
      repeatingStep3intervalRef.current = setInterval(() => {
        const credentials = localStorage.getItem("token");
        getData(url, credentials).then((data) => {
          {
            setStep3JobStatus(data.data.jobs[0].status);
            setStep3JobResult(data.data.jobs[0].result);
            setStep3FinishedDevices(data.data.jobs[0].finished_devices);
            setStep3JobData(data.data.jobs[0]);
            if (
              data.data.jobs[0].status === "FINISHED" ||
              data.data.jobs[0].status === "EXCEPTION" ||
              data.data.jobs[0].status === "ABORTED"
            ) {
              clearInterval(repeatingStep3intervalRef.current);
              setBlockNavigation(false);
            }
          }
        });
      }, 5000);
    }
  }, []);

  const readHeaders = useCallback((response, step) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log(`total: ${totalCountHeader}`);
      if (step == 2) {
        setStep2TotalCount(parseInt(totalCountHeader, 10));
      } else if (step == 3) {
        setStep3TotalCount(parseInt(totalCountHeader, 10));
      }
    } else {
      console.log(
        "Could not find X-Total-Count header, progress bar will not work",
      );
    }
    return response;
  }, []);

  const firmwareUpgradeStart = useCallback((step, filename, startAt, staggered_upgrade) => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/firmware/upgrade`;
    const dataToSend = getCommitTarget();
    if (
      process.env.FIRMWARE_URL !== undefined &&
      typeof process.env.FIRMWARE_URL === "string" &&
      process.env.FIRMWARE_URL.startsWith("http")
    ) {
      dataToSend.url = process.env.FIRMWARE_URL;
    } else {
      dataToSend.url = `${process.env.API_URL}/firmware/`;
    }
    dataToSend.comment = job_comment;
    dataToSend.ticket_ref = job_ticket_ref;

    if (step == 2) {
      dataToSend.pre_flight = true;
      dataToSend.download = true;
      dataToSend.filename = filename;
      dataToSend.activate = true;
      setFilename(filename);
    } else if (step == 3) {
      dataToSend.reboot = true;
      dataToSend.post_flight = true;
    } else {
      throw "Invalid argument passed to firmwareUpgradeStart";
    }

    if (startAt) {
      dataToSend.start_at = startAt;
    }

    if (staggered_upgrade) {
      dataToSend.staggered_upgrade = staggered_upgrade;
    }

    console.log(`Starting firmware upgrade job step ${step}`);

    console.log(`now it will post the data: ${JSON.stringify(dataToSend)}`);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => readHeaders(response, step))
      .then((response) => response.json())
      .then((data) => {
        console.log("this should be data", data);
        {
          if (step == 2) {
            setStep2JobId(data.job_id);
            pollJobStatus(data.job_id, step);
            console.log("this is new state", data);
          } else if (step == 3) {
            setStep3JobId(data.job_id);
            pollJobStatus(data.job_id, step);
            console.log("this is new state", data);
          }
        }
      });
  }, [getCommitTarget, job_comment, job_ticket_ref, readHeaders, pollJobStatus]);

  const firmwareUpgradeAbort = useCallback((step) => {
    const credentials = localStorage.getItem("token");
    let jobId = null;
    const dataToSend = {
      action: "ABORT",
      abort_reason: "Aborted from WebUI",
    };

    if (step == 2) {
      if (
        step2jobStatus === "RUNNING" ||
        step2jobStatus === "SCHEDULED"
      ) {
        jobId = step2jobId;
        const newLogLines = [...logLines];
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        newLogLines.push(`WEBUI job #${jobId}: Trying to abort job...\n`);
        setLogLines(newLogLines);
      } else {
        return;
      }
    } else if (step == 3) {
      if (
        step3jobStatus === "RUNNING" ||
        step3jobStatus === "SCHEDULED"
      ) {
        jobId = step3jobId;
        const newLogLines = [...logLines];
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        newLogLines.push(`WEBUI job #${jobId}: Trying to abort job...\n`);
        setLogLines(newLogLines);
      } else {
        return;
      }
    } else {
      throw "Invalid argument passed to firmwareUpgradeAbort";
    }
    const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;

    console.log(`Aborting firmware upgrade job step ${step}`);

    console.log(`now it will post the data: ${JSON.stringify(dataToSend)}`);
    fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`,
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => checkResponseStatus(response))
      .then((response) => readHeaders(response, step))
      .then((response) => response.json())
      .then((data) => {
        console.log("this should be data", data);
      });
  }, [step2jobStatus, step2jobId, step3jobStatus, step3jobId, logLines, readHeaders]);

  // Setup websocket connection
  useEffect(() => {
    const credentials = localStorage.getItem("token");
    socketRef.current = io(process.env.API_URL, { query: { jwt: credentials } });
    socketRef.current.on("connect", function () {
      console.log("Websocket connected!");
      const ret = socketRef.current.emit("events", { loglevel: "DEBUG" });
      console.log(ret);
    });
    socketRef.current.on("events", (data) => {
      setLogLines(prevLogLines => {
        const newLogLines = [...prevLogLines];
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        newLogLines.push(`${data}\n`);
        return newLogLines;
      });
    });

    return () => {
      if (socketRef.current !== null) {
        socketRef.current.off("events");
      }
    };
  }, []);

  // Handle navigation blocking
  useEffect(() => {
    if (blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }, [blockNavigation]);

  const commitTarget = getCommitTarget();
  const commitTargetName = getCommitTargetName(commitTarget);

  return (
    <>
      <Prompt
        when={blockNavigation}
        message="A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave."
      />
      <section>
        <h1>Firmware upgrade</h1>
        <p>Firmware upgrade target {commitTargetName}</p>
        <p>Describe the change:</p>
        <Input
          placeholder="comment"
          maxLength="255"
          className="job_comment"
          onChange={updateComment}
        />
        <p>Enter service ticket ID reference:</p>
        <Input
          placeholder="ticket reference"
          maxLength="32"
          className="job_ticket_ref"
          onChange={updateTicketRef}
        />
        <FirmwareStep1 commitTarget={commitTarget} />
        <FirmwareStep2
          firmwareUpgradeStart={firmwareUpgradeStart}
          firmwareUpgradeAbort={firmwareUpgradeAbort}
          jobStatus={step2jobStatus}
          jobId={step2jobId}
          jobResult={step2jobResult}
          jobFinishedDevices={step2finishedDevices}
          jobData={step2jobData}
          totalCount={step2totalCount}
          logLines={logLines}
          skipStep2={skipStep2}
        />
        <FirmwareStep3
          firmwareUpgradeStart={firmwareUpgradeStart}
          firmwareUpgradeAbort={firmwareUpgradeAbort}
          jobStatus={step3jobStatus}
          jobId={step3jobId}
          jobResult={step3jobResult}
          jobFinishedDevices={step3finishedDevices}
          jobData={step3jobData}
          totalCount={step3totalCount}
          logLines={logLines}
          filename={filename}
          activateStep3={activateStep3}
          commitTarget={commitTarget}
        />
      </section>
    </>
  );
}

FirmwareUpgrade.propTypes = {
  location: PropTypes.object.isRequired,
};

export default FirmwareUpgrade;
