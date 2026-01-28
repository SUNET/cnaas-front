import { useEffect, useRef, useState } from "react";
import { Prompt } from "react-router";
import queryString from "query-string";
import PropTypes from "prop-types";
import { Input } from "semantic-ui-react";
import { FirmwareStep1 } from "./FirmwareStep1";
import { FirmwareStep2 } from "./FirmwareStep2";
import { FirmwareStep3 } from "./FirmwareStep3";
import { getData } from "../../utils/getData";
import { useFreshRef } from "../../hooks/useFreshRef.js";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { post, putData } from "../../utils/sendData";

const io = require("socket.io-client");

let socket = null;

FirmwareUpgrade.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string,
  }),
};

export function FirmwareUpgrade({ location }) {
  const { token } = useAuthToken();
  const tokenRef = useFreshRef(token);

  const [step2totalCount, setStep2totalCount] = useState(0);
  const [step2jobId, setStep2jobId] = useState(null);
  const [step2jobData, setStep2jobData] = useState(null);
  const step2jobStatus = step2jobData?.status ?? null;

  const [step3totalCount, setStep3totalCount] = useState(0);
  const [step3jobId, setStep3jobId] = useState(null);
  const [step3jobData, setStep3jobData] = useState(null);
  const step3jobStatus = step3jobData?.status ?? null;

  const [activateStep3, setActivateStep3] = useState(false);
  const [filename, setFilename] = useState(null);
  const [jobComment, setJobComment] = useState("");
  const [jobTicketRef, setJobTicketRef] = useState("");
  const [logLines, setLogLines] = useState([]);
  const [blockNavigation, setBlockNavigation] = useState(false);

  const updateComment = (e) => {
    const val = e.target.value;
    setJobComment(val);
  };

  const updateTicketRef = (e) => {
    const val = e.target.value;
    setJobTicketRef(val);
  };

  const skipStep2 = () => {
    setActivateStep3(true);
  };

  const getCommitTarget = () => {
    const queryParams = queryString.parse(location.search);
    if (queryParams.hostname) {
      return { hostname: queryParams.hostname };
    }
    if (queryParams.group) {
      return { group: queryParams.group };
    }

    return null;
  };

  const getCommitTargetName = (target) => {
    if (target.hostname) {
      return `hostname: ${target.hostname}`;
    }
    if (target.group) {
      return `group: ${target.group}`;
    }

    return "unknown";
  };

  const repeatingStep2IntervalRef = useRef(null);
  const repeatingStep3intervalRef = useRef(null);

  useEffect(() => {
    socket = io(process.env.API_URL, { query: { jwt: tokenRef.current } });

    socket.on("connect", function () {
      socket.emit("events", { loglevel: "DEBUG" });
    });

    socket.on("error", (error) => {
      console.log("SOCKET ERROR", error);
    });

    socket.on("disconnect", (reason, details) => {
      console.log("SOCKET DISCONNECTED", reason, details);
    });

    socket.on("events", (data) => {
      setLogLines((prev) => {
        const updated = [...prev, `${data}\n`];
        if (updated.length >= 1000) {
          updated.shift();
        }
        return updated;
      });
    });

    return () => {
      if (socket !== null) socket.off("events");
      clearInterval(repeatingStep2IntervalRef.current);
      clearInterval(repeatingStep3intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }, [blockNavigation]);

  const pollJobStatus = async (id, step) => {
    const url = `${process.env.API_URL}/api/v1.0/job/${id}`;

    if (step === 2) {
      try {
        const initialStep2Data = await getData(url, tokenRef.current);
        const initialJobStep2Data = initialStep2Data.data.jobs[0];
        setStep2jobData(initialJobStep2Data);
        setBlockNavigation(true);
      } catch (error) {
        console.error("Polling error:", error);
        setBlockNavigation(false);
      }

      repeatingStep2IntervalRef.current = setInterval(async () => {
        try {
          const data = await getData(url, tokenRef.current);
          const jobData = data.data.jobs[0];
          setStep2jobData(jobData);
          if (
            jobData.status === "FINISHED" ||
            jobData.status === "EXCEPTION" ||
            jobData.status === "ABORTED"
          ) {
            clearInterval(repeatingStep2IntervalRef.current);
            setActivateStep3(true);
            setBlockNavigation(false);
            setDoPoll({ jobId: null, step: null });
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(repeatingStep2IntervalRef.current);
          repeatingStep2IntervalRef.current = null;
          setBlockNavigation(false);
        }
      }, 5000);
    }

    if (step === 3) {
      try {
        const initialStep3Data = await getData(url, tokenRef.current);
        const initialJobStep3Data = initialStep3Data.data.jobs[0];
        setStep3jobData(initialJobStep3Data);
        setBlockNavigation(true);
      } catch (error) {
        console.error("Polling error:", error);
        setBlockNavigation(false);
      }

      repeatingStep3intervalRef.current = setInterval(async () => {
        try {
          const data = await getData(url, tokenRef.current);
          const jobStep3Data = data.data.jobs[0];
          setStep3jobData(jobStep3Data);
          if (
            jobStep3Data.status === "FINISHED" ||
            jobStep3Data.status === "EXCEPTION" ||
            jobStep3Data.status === "ABORTED"
          ) {
            clearInterval(repeatingStep3intervalRef.current);
            setBlockNavigation(false);
            setDoPoll({ jobId: null, step: null });
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(repeatingStep3intervalRef.current);
          repeatingStep3intervalRef.current = null;
          setBlockNavigation(false);
        }
      }, 5000);
    }
  };

  const readHeaders = (response, step) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      if (step === 2) {
        setStep2totalCount(Number.parseInt(totalCountHeader, 10));
      } else if (step === 3) {
        setStep3totalCount(Number.parseInt(totalCountHeader, 10));
      }
    } else {
      console.log(
        "Could not find X-Total-Count header, progress bar will not work",
      );
    }

    return response;
  };

  const firmwareUpgradeStart = async (
    step,
    filename,
    startAt,
    staggeredUpgrade,
  ) => {
    const baseUrl =
      process.env.FIRMWARE_URL &&
      typeof process.env.FIRMWARE_URL === "string" &&
      process.env.FIRMWARE_URL.startsWith("http")
        ? process.env.FIRMWARE_URL
        : `${process.env.API_URL}/firmware/`;

    const dataToSend = {
      ...getCommitTarget(),
      url: baseUrl,
      comment: jobComment,
      ticket_ref: jobTicketRef,
      ...(step === 2 && {
        activate: true,
        download: true,
        filename,
        pre_flight: true,
      }),
      ...(step === 3 && {
        post_flight: true,
        reboot: true,
      }),
      ...(startAt && { start_at: startAt }),
      ...(staggeredUpgrade && { staggered_upgrade: staggeredUpgrade }),
    };

    if (step === 2) {
      setFilename(filename);
    }
    if (step !== 2 && step !== 3) {
      throw "Invalid argument passed to firmwareUpgradeStart";
    }

    const url = `${process.env.API_URL}/api/v1.0/firmware/upgrade`;
    const response = await post(url, token, dataToSend);
    readHeaders(response, step);
    const data = await response.json();
    if (step === 2) {
      setStep2jobId(data.job_id);
    } else if (step === 3) {
      setStep3jobId(data.job_id);
    }
    setDoPoll({ jobId: data.job_id, step });
  };

  const [doPoll, setDoPoll] = useState({ jobId: null, step: null });

  useEffect(() => {
    if (doPoll?.jobId && doPoll?.step) {
      pollJobStatus(doPoll.jobId, doPoll.step);
    }
  }, [doPoll]);

  const firmwareUpgradeAbort = async (step) => {
    if (step !== 2 && step !== 3) {
      throw "Invalid argument passed to firmwareUpgradeAbort";
    }

    let jobId = null;
    if (step === 2) {
      if (step2jobStatus === "RUNNING" || step2jobStatus === "SCHEDULED") {
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
    }

    if (step === 3) {
      if (step3jobStatus === "RUNNING" || step3jobStatus === "SCHEDULED") {
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
    }

    const url = `${process.env.API_URL}/api/v1.0/job/${jobId}`;
    const dataToSend = {
      action: "ABORT",
      abort_reason: "Aborted from WebUI",
    };
    console.log(`Aborting firmware upgrade job ${jobId} step ${step}`);
    const response = await putData(url, token, dataToSend);
    readHeaders(response, step);
  };

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
          jobId={step2jobId}
          jobData={step2jobData}
          totalCount={step2totalCount}
          logLines={logLines}
          skipStep2={skipStep2}
        />
        <FirmwareStep3
          firmwareUpgradeStart={firmwareUpgradeStart}
          firmwareUpgradeAbort={firmwareUpgradeAbort}
          jobId={step3jobId}
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
