import Prism from "prismjs";
import queryString from 'query-string';
import React from "react";
import { Prompt } from 'react-router';
import { Link } from 'react-router-dom';
import { SemanticToastContainer, toast } from 'react-semantic-toasts-2';
import '../../styles/react-semantic-alert.css';
import checkResponseStatus from "../../utils/checkResponseStatus";
import getData from "../../utils/getData";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import ConfigChangeStep4 from "./ConfigChangeStep4";
import DryRun from "./DryRun/DryRun";
import SyncStatus from "./SyncStatus";
import VerifyDiff from "./VerifyDiff/VerifyDiff";

const io = require("socket.io-client");
var socket = null;

class ConfigChange extends React.Component {
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
      syncEventCounter: 0
    }
  };

  constructor() {
    super();
    this.state = this.getInitialState();
        this.syncstatuschild = React.createRef();
  }

  resetState = () => {
    console.log(this.getInitialState());
    this.setState(this.getInitialState());
    this.syncstatuschild.current.getDeviceList();
    this.syncstatuschild.current.getSyncHistory();
  }

  setRepoWorking = (working_status) => {
    if (this.state.repoWorking === true && working_status === false) {
      this.syncstatuschild.current.getDeviceList();
      this.syncstatuschild.current.getSyncHistory();
    }
    this.setState({ repoWorking: working_status });
  }

  handleDryRunReady() {
    const element = document.getElementById('dryrunButton');
    element.scrollIntoView({ block: 'start', behavior: 'smooth' });
    this.deviceSyncStart({ "resync": this.state.resync })
    this.setState({ dryRunDisable: true })
  }

  readHeaders = (response, dry_run) => {
    const totalCountHeader = Number(response.headers.get("X-Total-Count"));
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log("total: " + totalCountHeader);
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
    let url = process.env.API_URL + "/api/v1.0/device_syncto";
    let dataToSend = this.getCommitTarget();
    dataToSend["dry_run"] = true;

    if (options !== undefined) {
      if (options.resync !== undefined) {
        dataToSend["resync"] = options.resync;
      }
      if (options.force !== undefined) {
        dataToSend["force"] = options.force;
        this.setState({ synctoForce: true });
      }
      if (options.dry_run !== undefined) {
        dataToSend["dry_run"] = options.dry_run;
      }
      if (options.comment !== undefined) {
        dataToSend["comment"] = options.comment;
      }
      if (options.ticket_ref !== undefined) {
        dataToSend["ticket_ref"] = options.ticket_ref;
      }
      if (options.confirm_mode !== undefined && options.confirm_mode >= 0) {
        dataToSend["confirm_mode"] = options.confirm_mode;
      }
    } else {
      options = {};
    }

    if (dataToSend["dry_run"] === false) {
      console.log("sync live run");
      if (this.state.synctoForce) {
        dataToSend["force"] = true;
      }
    }

    console.log("now it will post the data: " + JSON.stringify(dataToSend));
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
      .then(response => checkResponseStatus(response))
      .then(response => this.readHeaders(response, dataToSend["dry_run"]))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          if (dataToSend["dry_run"] === true) {
            this.setState(
              {
                dryRunSyncData: data
              },
              () => {
                this.pollJobStatus(data.job_id, "dry_run");
              },
              () => {
                console.log("this is new state", this.state.dryRunSyncData);
              }
            );
          } else {
            this.setState(
              {
                liveRunSyncData: data
              },
              () => {
                this.pollJobStatus(data.job_id, "live_run");
              },
              () => {
                console.log("this is new state", this.state.liveRunSyncData);
              }
            );
          }
        }
      });
  };

  pollJobStatus = (job_id, jobtype) => {
    let credentials = localStorage.getItem("token");
    let url = process.env.API_URL + `/api/v1.0/job/${job_id}`;
    let repeatInterval = null;
    let stateProperty = null;

    if (jobtype === "dry_run") {
      repeatInterval = this.repeatingDryrunJobData;
      stateProperty = "dryRunProgressData";
    } else if (jobtype === "live_run") {
      repeatInterval = this.repeatingLiverunJobData;
      stateProperty = "liveRunProgressData";
    } else if (jobtype === "confirm_run") {
      repeatInterval = this.repeatingConfirmrunJobData;
      stateProperty = "confirmRunProgressData";
    } else {
      throw new Error("pollJobStatus called with unknown jobtype");
    }

    getData(url, credentials).then(data => {
      {
        this.setState({
          [stateProperty]: data.data.jobs,
          blockNavigation: true
        });
      }
    });
    repeatInterval = setInterval(() => {
      let credentials = localStorage.getItem("token");
      getData(url, credentials).then(data => {
        {
          let jobdata = data.data.jobs[0];
          this.setState({
            [stateProperty]: jobdata
          });
          if (jobdata.status === "FINISHED" || jobdata.status === "EXCEPTION" || jobdata.status === "ABORTED") {
            clearInterval(repeatInterval);
            this.setState({ blockNavigation: false });
            if (jobtype === "live_run" && jobdata.status === "FINISHED" && typeof jobdata.next_job_id === "number") {
              this.pollJobStatus(jobdata.next_job_id, "confirm_run");
              console.log("Config change with next_job_id detected (commitmode 2): " + jobdata.next_job_id);
            }
            Prism.highlightAll();
          }
        }
      });
    }, 1000);
  };

  getCommitTarget() {
    let queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return { hostname: queryParams.hostname }
    }
    else if (queryParams.group !== undefined) {
      return { group: queryParams.group }
    } else {
      return { all: true };
    }
  };

  componentDidMount() {
    let queryParams = queryString.parse(this.props.location.search);
    if (queryParams.scrollTo !== undefined) {
      const element = document.getElementById(queryParams.scrollTo + '_section');
      if (element) {
        element.scrollIntoView({ alignToTop: true, behavior: 'smooth' });
      }
    }

    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on('connect', function (data) {
      console.log('Websocket connected!');
      var ret = socket.emit('events', { 'loglevel': 'DEBUG' });
      console.log(ret);
      ret = socket.emit('events', { 'sync': 'all' });
      console.log(ret);
    });
    socket.on('events', (data) => {
      // sync events
      if (data.syncevent_hostname !== undefined && data.syncevent_data !== undefined) {
        let target = this.getCommitTarget();
        let showEvent = false;
        if (target.hostname !== undefined) {
          if (target.hostname == data.syncevent_hostname) {
            showEvent = true;
          }
        } else {
          showEvent = true;
        }
        // don't show events while refreshing settings/templates via buttons
        if (this.state.repoWorking === true) {
          if (data.syncevent_data.cause.startsWith('refresh_')) {
            showEvent = false;
          }
        }
        if (showEvent) {
          this.setState({ syncEventCounter: this.state.syncEventCounter + 1 });
          console.log("syncevent for:" + data.syncevent_hostname);
          console.log(data.syncevent_data);
          toast({
            type: 'warning',
            icon: 'paper plane',
            title: ('Sync event (' + this.state.syncEventCounter + '): ' + data.syncevent_hostname),
            description: <p>{data.syncevent_data.cause} by {data.syncevent_data.by} <br /><Link onClick={() => window.location.reload()}>Reload page</Link></p>,
            animation: 'bounce',
            time: 0
          });
        }
        // log events
      } else if (typeof data === 'string' || data instanceof String) {
        var newLogLines = this.state.logLines;
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        newLogLines.push(data + "\n");
        this.setState({ logLines: newLogLines });
        // Disable confirm commit by reseting dryrun jobstatus if someone else refreshes repos
        if (data.includes("refresh repo") === true) {
          this.setState({ dryRunProgressData: [] });
          console.log("Refresh repo event, reset dryrun status: ", data);
        }
      }
    });
    socket.on('')
  };

  componentWillUnmount() {
    if (socket !== null) {
      socket.off('events');
    }
  }

  componentDidUpdate = () => {
    if (this.state.blockNavigation) {
      window.onbeforeunload = () => true
    } else {
      window.onbeforeunload = undefined
    }
  }

  render() {
    let dryRunProgressData = this.state.dryRunProgressData;
    let dryRunJobStatus = "";
    let dryRunResults = "";
    let dryRunChangeScore = "";
    let dryRunJobId = "NA";
    let liveRunProgressData = this.state.liveRunProgressData;
    let liveRunJobStatus = "";
    let liveRunResults = "";
    let liveRunJobId = "NA";
    let confirmRunProgressData = this.state.confirmRunProgressData;
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

    return (
      <React.Fragment>
        <Prompt
          when={this.state.blockNavigation}
          message="A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave."
        />
        <SemanticToastContainer position="top-right" maxToasts={3} />
        <section>
          <SyncStatus target={this.getCommitTarget()} ref={this.syncstatuschild} />
          <ConfigChangeStep1
            dryRunJobStatus={dryRunJobStatus}
            setRepoWorking={this.setRepoWorking.bind(this)}
            onDryRunReady={this.handleDryRunReady.bind(this)}
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
      </React.Fragment>
    );
  }
}

export default ConfigChange;
