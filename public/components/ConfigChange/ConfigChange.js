import React from "react";
import { Prompt } from 'react-router';
import { Input } from 'semantic-ui-react';
import ConfigChangeStep1 from "./ConfigChangeStep1";
import DryRun from "./DryRun/DryRun";
import VerifyDiff from "./VerifyDiff/VerifyDiff";
import ConfigChangeStep4 from "./ConfigChangeStep4";
import checkResponseStatus from "../../utils/checkResponseStatus";
// import { postData } from "../../utils/sendData";
import getData from "../../utils/getData";
import queryString from 'query-string';
import Prism from "prismjs";
const io = require("socket.io-client");
var socket = null;

class ConfigChange extends React.Component {
  getInitialState() {
    return {
      dryRunSyncData: [],
      dryRunSyncJobid: null,
      dryRunProgressData: {},
      dryRunTotalCount: 0,
      synctoForce: false,
      liveRunSyncData: [],
      liveRunProgressData: {},
      liveRunTotalCount: 0,
      confirmRunProgressData: {},
      job_comment: "",
      job_ticket_ref: "",
      logLines: [],
      blockNavigation: false,
      repoWorking: false
    }
  };

  constructor() {
    super();
    this.state = this.getInitialState();
  }

  resetState = () => {
    console.log(this.getInitialState());
    this.setState(this.getInitialState());
  }

  setRepoWorking = (working_status) => {
    this.setState({repoWorking: working_status});
  }

  updateComment(e) {
    const val = e.target.value;
    this.setState({
      job_comment: val
    });
  }

  updateTicketRef(e) {
    const val = e.target.value;
    this.setState({
      job_ticket_ref: val
    });
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
    dataToSend["comment"] = this.state.job_comment;
    dataToSend["ticket_ref"] = this.state.job_ticket_ref;
   
    if (options !== undefined) {
      if (options.resync !== undefined) {
        dataToSend["resync"] = options.resync;
      }
      if (options.force !== undefined) {
        dataToSend["force"] = options.force;
        this.setState({synctoForce: true});
      }
      if (options.dry_run !== undefined) {
        dataToSend["dry_run"] = options.dry_run;
      }
      if (options.commit_mode !== undefined && options.commit_mode >= 0) {
        dataToSend["commit_mode"] = options.commit_mode;
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

    console.log("now it will post the data: "+JSON.stringify(dataToSend));
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
    const credentials = localStorage.getItem("token");
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
      getData(url, credentials).then(data => {
        {
          let jobdata = data.data.jobs[0];
          this.setState({
            [stateProperty]: jobdata
          });
          if (jobdata.status === "FINISHED" || jobdata.status === "EXCEPTION" || jobdata.status === "ABORTED") {
            clearInterval(repeatInterval);
            this.setState({blockNavigation: false});
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
      return {hostname: queryParams.hostname}
    }
    else if (queryParams.group !== undefined) {
      return {group: queryParams.group}
    } else {
      return {all: true};
    }
  };

  getCommitTargetName(target) {
    if (target.all !== undefined) {
      return "All unsynchronized devices";
    } else if (target.hostname !== undefined) {
      return "Hostname: " + target.hostname
    } else if (target.group !== undefined) {
      return "Group: " + target.group
    } else {
      return "Unknown"
    }
  };

  componentDidMount(){
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, {query: {jwt: credentials}});
    socket.on('connect', function(data) {
      console.log('Websocket connected!');
      var ret = socket.emit('events', {'loglevel': 'DEBUG'});
      console.log(ret);
    });
    socket.on('events', (data) => {
      var newLogLines = this.state.logLines;
      if (newLogLines.length >= 1000) {
        newLogLines.shift();
      }
      newLogLines.push(data + "\n");
      this.setState({logLines: newLogLines});
      // Disable confirm commit by reseting dryrun jobstatus if someone else refreshes repos
      if (data.includes("refresh repo") === true) {
        this.setState({dryRunProgressData: []});
        console.log("Refresh repo event, reset dryrun status: ", data);
      }
    });
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
    let commitTargetName = this.getCommitTargetName(this.getCommitTarget());

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
        <section>
          <h1>Commit changes (syncto)</h1>
          <p>Commit changes to: { commitTargetName }</p>
          <p>Describe the change:</p>
          <Input placeholder="comment"
            maxLength="255"
            className="job_comment"
            onChange={this.updateComment.bind(this)}
          />
          <p>Enter service ticket ID reference:</p>
          <Input placeholder="ticket reference"
            maxLength="32"
            className="job_ticket_ref"
            onChange={this.updateTicketRef.bind(this)}
          />
          <ConfigChangeStep1
            dryRunJobStatus={dryRunJobStatus}
            setRepoWorking={this.setRepoWorking}
          />
          <DryRun
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
            jobComment={this.state.job_comment}
            jobTicketRef={this.state.job_ticket_ref}
            dryRunChangeScore={dryRunChangeScore}
            synctoForce={this.state.synctoForce}
          />
        </section>
      </React.Fragment>
    );
  }
}

export default ConfigChange;
