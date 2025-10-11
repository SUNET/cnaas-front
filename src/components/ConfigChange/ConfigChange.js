import queryString from "query-string";
import React from "react";
import { Prompt } from "react-router";
import { Button } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import "../../styles/react-semantic-alert.css";
import checkResponseStatus from "../../utils/checkResponseStatus";
import { getData } from "../../utils/getData";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import ConfigChangeStep4 from "./ConfigChangeStep4";
import DryRun from "./DryRun/DryRun";
import SyncStatus from "./SyncStatus";
import VerifyDiff from "./VerifyDiff/VerifyDiff";

const io = require("socket.io-client");

let socket = null;

class ConfigChange extends React.Component {
  constructor() {
    super();
    this.state = this.getInitialState();
    this.syncstatuschild = React.createRef();
  }

  getInitialState() {
    return {
      dryRunSyncData: [],
      dryRunSyncJobid: null,
      dryRunProgressData: {},
      dryRunTotalCount: 0,
      dryRunDisable: false,
      synctoForce: false,
      liveRunSyncData: [],
      liveRunProgressData: {},
      liveRunTotalCount: 0,
      confirmRunProgressData: {},
      logLines: [],
      blockNavigation: false,
      repoWorking: false,
      repoJob: null,
      prevRepoJobs: [],
      syncEventCounter: 0,
    };
  }

  componentDidMount() {
    const queryParams = queryString.parse(this.props.location.search);
    if (queryParams.scrollTo !== undefined) {
      const element = document.getElementById(
        `${queryParams.scrollTo}_section`,
      );
      if (element) {
        element.scrollIntoView({ alignToTop: true, behavior: "smooth" });
      }
    }

    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", function () {
      console.log("Websocket connected!");
      let ret = socket.emit("events", { loglevel: "DEBUG" });
      if (ret !== undefined && ret.connected) {
        console.log("Listening to log events");
      }
      ret = socket.emit("events", { sync: "all" });
      if (ret !== undefined && ret.connected) {
        console.log("Listening to sync events");
      }
      ret = socket.emit("events", { update: "job" });
      if (ret !== undefined && ret.connected) {
        console.log("Listening to job update events");
      }
    });
    socket.on("events", (data) => {
      // job events
      if (data.job_id !== undefined) {
        const { repoWorking, repoJob } = this.state;
        if (
          ((repoJob === null && repoWorking === true) || repoJob === -1) &&
          data.status === "RUNNING"
        ) {
          console.log(
            `New refresh repo job: ${data.job_id} status ${data.status}`,
          );
          this.setState({ repoJob: data.job_id });
        } else if (
          repoJob !== null &&
          (data.status === "FINISHED" ||
            data.status === "EXCEPTION" ||
            data.status === "ABORTED")
        ) {
          // add finished job to list of previous jobs so we can catch events that come after job status has changed
          console.log(
            `Stopped refresh repo job: ${data.job_id} status ${data.status}`,
          );
          this.setState((prevState) => {
            const newRepoJobs = prevState.prevRepoJobs;
            if (
              Array.isArray(newRepoJobs) &&
              newRepoJobs.indexOf(prevState.repoJob) === -1 &&
              Number.isInteger(prevState.repoJob) &&
              prevState.repoJob !== -1
            ) {
              newRepoJobs.push(prevState.repoJob);
              return {
                prevRepoJobs: newRepoJobs,
                repoJob: null,
              };
            }
            console.log(prevState);

            return prevState;
          });
        } else if (
          data.status === "RUNNING" &&
          data.function_name === "refresh_repo"
        ) {
          const { dryRunProgressData } = this.state;
          if (dryRunProgressData.length !== 0) {
            this.setState({ dryRunProgressData: [] });
            toast({
              type: "warning",
              icon: "paper plane",
              title: `Another session did refresh`,
              description: (
                <p>
                  Dry run progress reset because refresh repo job {data.job_id}
                  <br />
                  <Link to="/jobs">job log</Link>
                </p>
              ),
              animation: "bounce",
              time: 0,
            });
          }
        }
        // sync events
      } else if (
        data.syncevent_hostname !== undefined &&
        data.syncevent_data !== undefined
      ) {
        const target = this.getCommitTarget();
        let showEvent = false;
        if (target.hostname !== undefined) {
          if (target.hostname == data.syncevent_hostname) {
            showEvent = true;
          }
        } else {
          showEvent = true;
        }
        if (data.syncevent_data.job_id !== undefined) {
          // repoJob -1 signals we are waiting to get the job id, delay a bit and check repoJob again
          const { repoJob, prevRepoJobs } = this.state;
          if (repoJob === -1) {
            showEvent = false;
            setTimeout(() => {
              // https://stackoverflow.com/questions/65253665/settimeout-for-this-state-vs-usestate case6 ?
              this.setState((prevState) => {
                if (
                  data.syncevent_data.job_id === prevState.repoJob ||
                  (Array.isArray(prevState.prevRepoJobs) &&
                    prevState.prevRepoJobs.includes(data.syncevent_data.job_id))
                ) {
                  toast({
                    type: "info",
                    icon: "paper plane",
                    title: `Refresh affected: ${data.syncevent_hostname}`,
                    time: 2000,
                  });
                }
                return prevState;
              });
            }, 500);
            // show non-warning toast for events generated by user in current or previous jobs
          } else if (
            data.syncevent_data.job_id === repoJob ||
            prevRepoJobs.includes(data.syncevent_data.job_id)
          ) {
            showEvent = false;
            toast({
              type: "info",
              icon: "paper plane",
              title: `Refresh affected: ${data.syncevent_hostname}`,
              time: 2000,
            });
          }
        }
        if (showEvent) {
          const { syncEventCounter } = this.state;
          this.setState({ syncEventCounter: syncEventCounter + 1 });
          toast({
            type: "warning",
            icon: "paper plane",
            title: `Sync event (${syncEventCounter}): ${data.syncevent_hostname}`,
            description: (
              <p>
                {data.syncevent_data.cause} by {data.syncevent_data.by} <br />
                <Button onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              </p>
            ),
            animation: "bounce",
            time: 0,
          });
        }
        // log events
      } else if (typeof data === "string" || data instanceof String) {
        this.setState((prevState) => {
          const newLogLines = prevState.logLines;
          newLogLines.push(`${data}\n`);
          if (newLogLines.length >= 1000) {
            newLogLines.shift();
          }

          return {
            logLines: newLogLines,
          };
        });
      }
    });
    socket.on("");

    if (queryParams.autoDryRun !== undefined) {
      this.handleDryRunReady();
    }
  }

  componentDidUpdate() {
    if (this.state.blockNavigation) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    if (socket !== null) {
      socket.off("events");
    }
  }

  handleDryRunReady() {
    const element = document.getElementById("dryrunButton");
    element.scrollIntoView({ block: "start", behavior: "smooth" });
    this.deviceSyncStart({ resync: false });
  }

  getCommitTarget() {
    const queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return { hostname: queryParams.hostname };
    }
    if (queryParams.group !== undefined) {
      return { group: queryParams.group };
    }
    return { all: true };
  }

  resetState = () => {
    console.log(this.getInitialState());
    this.setState(this.getInitialState());
    this.syncstatuschild.current.getDeviceList();
    this.syncstatuschild.current.getSyncHistory();
    this.setState({ dryRunDisable: false });
  };

  setRepoWorking = (workingStatus) => {
    let ret = null;
    if (this.state.repoWorking === true && workingStatus === false) {
      this.syncstatuschild.current.getDeviceList();
      this.syncstatuschild.current.getSyncHistory();
      ret = this.setState({ repoWorking: workingStatus });
    } else {
      ret = this.setState((prevState) => {
        let jobId = prevState.repoJob;
        if (jobId === null) {
          jobId = -1; // signal that we should start looking for jobs in events job updates
        }
        return { ...prevState, repoJob: jobId, repoWorking: workingStatus };
      });
    }
    return ret;
  };

  readHeaders = (response, dry_run) => {
    const totalCountHeader = Number(response.headers.get("X-Total-Count"));
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log(`total: ${totalCountHeader}`);
      if (dry_run === true) {
        this.setState({ dryRunTotalCount: totalCountHeader });
      } else {
        this.setState({ liveRunTotalCount: totalCountHeader });
      }
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
    return response;
  };

  deviceSyncStart = (options) => {
    console.log("Starting sync devices");
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
    const dataToSend = this.getCommitTarget();
    dataToSend.dry_run = true;

    if (options !== undefined) {
      if (options.resync !== undefined) {
        dataToSend.resync = options.resync;
      }
      if (options.force !== undefined) {
        dataToSend.force = options.force;
        this.setState({ synctoForce: true });
      }
      if (options.dry_run !== undefined) {
        dataToSend.dry_run = options.dry_run;
      }
      if (options.comment !== undefined) {
        dataToSend.comment = options.comment;
      }
      if (options.ticket_ref !== undefined) {
        dataToSend.ticket_ref = options.ticket_ref;
      }
      if (options.confirm_mode !== undefined && options.confirm_mode >= 0) {
        dataToSend.confirm_mode = options.confirm_mode;
      }
    } else {
      options = {};
    }

    if (dataToSend.dry_run === false) {
      console.log("sync live run");
      if (this.state.synctoForce) {
        dataToSend.force = true;
      }
    }

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
      .then((response) => this.readHeaders(response, dataToSend.dry_run))
      .then((response) => response.json())
      .then((data) => {
        console.log("this should be data", data);
        if (dataToSend.dry_run === true) {
          this.setState(
            {
              dryRunSyncData: data,
            },
            () => {
              this.pollJobStatus(data.job_id, "dry_run");
            },
            () => {
              console.log("this is new state", this.state.dryRunSyncData);
            },
          );
        } else {
          this.setState(
            {
              liveRunSyncData: data,
            },
            () => {
              this.pollJobStatus(data.job_id, "live_run");
            },
            () => {
              console.log("this is new state", this.state.liveRunSyncData);
            },
          );
        }
      });
    this.setState({ dryRunDisable: true });
  };

  pollJobStatus = (job_id, jobtype) => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/job/${job_id}`;
    let repeatInterval = null;
    let stateProperty = null;

    if (jobtype === "dry_run") {
      stateProperty = "dryRunProgressData";
    } else if (jobtype === "live_run") {
      stateProperty = "liveRunProgressData";
    } else if (jobtype === "confirm_run") {
      stateProperty = "confirmRunProgressData";
    } else {
      throw new Error("pollJobStatus called with unknown jobtype");
    }

    getData(url, credentials).then((data) => {
      this.setState({
        [stateProperty]: data.data.jobs,
        blockNavigation: true,
      });
    });
    repeatInterval = setInterval(() => {
      const credentials = localStorage.getItem("token");
      getData(url, credentials).then((data) => {
        const jobdata = data.data.jobs[0];
        this.setState({
          [stateProperty]: jobdata,
        });
        if (
          jobdata.status === "FINISHED" ||
          jobdata.status === "EXCEPTION" ||
          jobdata.status === "ABORTED"
        ) {
          clearInterval(repeatInterval);
          this.setState({ blockNavigation: false });
          if (
            jobtype === "live_run" &&
            jobdata.status === "FINISHED" &&
            typeof jobdata.next_job_id === "number"
          ) {
            this.pollJobStatus(jobdata.next_job_id, "confirm_run");
            console.log(
              `Config change with next_job_id detected (commitmode 2): ${jobdata.next_job_id}`,
            );
          }
        }
      });
    }, 1000);
  };

  render() {
    const { dryRunProgressData } = this.state;
    let dryRunJobStatus = "";
    let dryRunResults = "";
    let dryRunChangeScore = "";
    let dryRunJobId = "NA";
    const { liveRunProgressData } = this.state;
    let liveRunJobStatus = "";
    let liveRunResults = "";
    let liveRunJobId = "NA";
    const { confirmRunProgressData } = this.state;
    let confirmRunJobStatus = "";
    let confirmRunJobId = "NA";

    if (Object.keys(dryRunProgressData).length > 0) {
      dryRunJobStatus = dryRunProgressData.status;
      dryRunChangeScore = dryRunProgressData.change_score;
      dryRunJobId = dryRunProgressData.id;
    }

    if (dryRunJobStatus === "FINISHED") {
      dryRunResults = dryRunProgressData.result.devices;
    }

    if (Object.keys(liveRunProgressData).length > 0) {
      liveRunJobStatus = liveRunProgressData.status;
      liveRunJobId = liveRunProgressData.id;
    }

    if (liveRunJobStatus === "FINISHED") {
      liveRunResults = liveRunProgressData.result.devices;
    }

    if (Object.keys(confirmRunProgressData).length > 0) {
      confirmRunJobStatus = confirmRunProgressData.status;
      confirmRunJobId = confirmRunProgressData.id;
    }

    const { prevRepoJobs, repoJob } = this.state;
    const allRepoJobs = prevRepoJobs.slice(); // make a copy
    if (Array.isArray(allRepoJobs) && repoJob !== null) {
      allRepoJobs.push(repoJob);
    }

    return (
      <>
        <Prompt
          when={this.state.blockNavigation}
          message="A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave."
        />
        <SemanticToastContainer position="top-right" maxToasts={3} />
        <section>
          <SyncStatus
            target={this.getCommitTarget()}
            ref={this.syncstatuschild}
          />
          <ConfigChangeStep1
            dryRunJobStatus={dryRunJobStatus}
            setRepoWorking={this.setRepoWorking.bind(this)}
            onDryRunReady={this.handleDryRunReady.bind(this)}
            repoJobs={allRepoJobs}
            logLines={this.state.logLines}
          />
          <DryRun
            dryRunDisable={this.state.dryRunDisable}
            dryRunSyncStart={this.deviceSyncStart}
            dryRunProgressData={dryRunProgressData}
            dryRunJobStatus={dryRunJobStatus}
            jobId={dryRunJobId}
            devices={dryRunResults}
            totalCount={this.state.dryRunTotalCount}
            logLines={this.state.logLines}
            resetState={this.resetState}
            repoWorkingState={this.state.repoWorking}
          />
          <VerifyDiff
            dryRunChangeScore={dryRunChangeScore}
            devices={dryRunResults}
          />
          <ConfigChangeStep4
            liveRunSyncStart={this.deviceSyncStart}
            liveRunProgressData={liveRunProgressData}
            liveRunJobStatus={liveRunJobStatus}
            dryRunJobStatus={dryRunJobStatus}
            jobId={liveRunJobId}
            confirmRunProgressData={confirmRunProgressData}
            confirmRunJobStatus={confirmRunJobStatus}
            confirmJobId={confirmRunJobId}
            devices={liveRunResults}
            totalCount={this.state.liveRunTotalCount}
            logLines={this.state.logLines}
            dryRunChangeScore={dryRunChangeScore}
            synctoForce={this.state.synctoForce}
          />
        </section>
      </>
    );
  }
}

export default ConfigChange;
