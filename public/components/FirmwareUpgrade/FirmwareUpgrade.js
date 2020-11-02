import React from "react";
import { Prompt } from 'react-router';
import queryString from 'query-string';
import { Input } from 'semantic-ui-react';
import FirmwareStep1 from './FirmwareStep1';
import FirmwareStep2 from './FirmwareStep2';
import FirmwareStep3 from './FirmwareStep3';
import checkResponseStatus from "../../utils/checkResponseStatus";
import getData from "../../utils/getData";
const io = require("socket.io-client");
var socket = null;

class FirmwareUpgrade extends React.Component {
  state = {
    step2totalCount: 0,
    step2jobId: null,
    step2jobStatus: null,
    step2jobResult: null,
    step2finishedDevices: [],
    step2jobData: null,
    step3totalCount: 0,
    step3jobId: null,
    step3jobStatus: null,
    step3jobResult: null,
    step3finishedDevices: [],
    step3jobData: null,
    activateStep3: false,
    filename: null,
    job_comment: "",
    job_ticket_ref: "",
    logLines: [],
    blockNavigation: false
  };

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

  getCommitTarget() {
    let queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return {hostname: queryParams.hostname}
    }
    else if (queryParams.group !== undefined) {
      return {group: queryParams.group}
    } else {
      return null;
    }
  };

  getCommitTargetName(target) {
    if (target.hostname !== undefined) {
      return "hostname: " + target.hostname
    } else if (target.group !== undefined) {
      return "group: " + target.group
    } else {
      return "unknown"
    }
  };

  pollJobStatus = (job_id, step) => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + `/api/v1.0/job/${job_id}`;

    if (step == 2) {
      getData(url, credentials).then(data => {
        {
          this.setState({
            step2jobStatus: data.data.jobs[0].status,
            step2jobResult: data.data.jobs[0].result,
            step2finishedDevices: data.data.jobs[0].finished_devices,
            step2jobData: data.data.jobs[0],
            blockNavigation: true
          });
        }
      });
      this.repeatingStep2interval = setInterval(() => {
        getData(url, credentials).then(data => {
          {
            this.setState({
              step2jobStatus: data.data.jobs[0].status,
              step2jobResult: data.data.jobs[0].result,
              step2finishedDevices: data.data.jobs[0].finished_devices,
              step2jobData: data.data.jobs[0]
            });
            if (data.data.jobs[0].status === "FINISHED" || data.data.jobs[0].status === "EXCEPTION") {
              clearInterval(this.repeatingStep2interval);
              this.setState({activateStep3: true, blockNavigation: false});
            }
          }
        });
      }, 5000);
    } else if (step == 3) {
      getData(url, credentials).then(data => {
        {
          this.setState({
            step3jobStatus: data.data.jobs[0].status,
            step3jobResult: data.data.jobs[0].result,
            step3finishedDevices: data.data.jobs[0].finished_devices,
            step3jobData: data.data.jobs[0],
            blockNavigation: true
          });
        }
      });
      this.repeatingStep3interval = setInterval(() => {
        getData(url, credentials).then(data => {
          {
            this.setState({
              step3jobStatus: data.data.jobs[0].status,
              step3jobResult: data.data.jobs[0].result,
              step3finishedDevices: data.data.jobs[0].finished_devices,
              step3jobData: data.data.jobs[0]
            });
            if (data.data.jobs[0].status === "FINISHED" || data.data.jobs[0].status === "EXCEPTION") {
              clearInterval(this.repeatingStep3interval, blockNavigation: false);
            }
          }
        });
      }, 5000);
    }
  };

  readHeaders = (response, step) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log("total: " + totalCountHeader);
      if (step == 2) {
        this.setState({ step2totalCount: totalCountHeader });
      } else if (step == 3) {
        this.setState({ step3totalCount: totalCountHeader });
      }
    } else {
      console.log("Could not find X-Total-Count header, progress bar will not work");
    }
    return response;
  };

  firmwareUpgradeStart = (step, filename) => {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/firmware/upgrade";
    let dataToSend = this.getCommitTarget();
    dataToSend["url"] = process.env.API_URL + "/firmware/";
   
    if (step == 2) {
      dataToSend["pre_flight"] = true;
//      dataToSend["download"] = true;
      dataToSend["filename"] = filename;
//      dataToSend["activate"] = true;
      this.setState({filename: filename});
    }
    else if (step == 3) {
//      dataToSend["reboot"] = true;
//      dataToSend["post_flight"] = true;
      dataToSend["post_waittime"] = 600;
      dataToSend["filename"] = filename;
    } else {
      throw 'Invalid argument passed to firmwareUpgradeStart';
    }

    console.log("Starting firmware upgrade job step "+step);

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
      .then(response => this.readHeaders(response, step))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          if (step == 2) {
            this.setState(
              {
                step2data: data,
                step2jobId: data.job_id
              },
              () => {
                this.pollJobStatus(data.job_id, step);
              },
              () => {
                console.log("this is new state", this.state.step2data);
              }
            );
          } else if (step == 3) {
            this.setState(
              {
                step3data: data,
                step3jobId: data.job_id
              },
              () => {
                this.pollJobStatus(data.job_id, step);
              },
              () => {
                console.log("this is new state", this.state.step3data);
              }
            );
          }
        }
      });
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
    });
  };

  componentWillUnmount() {
    if (socket !== null) {
      socket.off('events');
    }
  }

  render() {
    const commitTarget = this.getCommitTarget();
    const commitTargetName = this.getCommitTargetName(commitTarget);
    return (
      <React.Fragment>
        <Prompt
          when={this.state.blockNavigation}
          message="A job is currently running, you sure you want to leave? The job will continue to run in the background even if you leave."
          />
        <section>
          <h1>Firmware upgrade</h1>
          <p>Firmware upgrade target { commitTargetName }</p>
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
          <FirmwareStep1
            groupName={commitTarget.group}
          />
          <FirmwareStep2
            firmwareUpgradeStart={this.firmwareUpgradeStart}
            jobStatus={this.state.step2jobStatus}
            jobId={this.state.step2jobId}
            jobResult={this.state.step2jobResult}
            jobFinishedDevices={this.state.step2finishedDevices}
            jobData={this.state.step2jobData}
            totalCount={this.state.step2totalCount}
            logLines={this.state.logLines}
          />
          <FirmwareStep3
            firmwareUpgradeStart={this.firmwareUpgradeStart}
            jobStatus={this.state.step3jobStatus}
            jobId={this.state.step3jobId}
            jobResult={this.state.step3jobResult}
            jobFinishedDevices={this.state.step3finishedDevices}
            jobData={this.state.step3jobData}
            totalCount={this.state.step3totalCount}
            logLines={this.state.logLines}
            filename={this.state.filename}
            activateStep3={this.state.activateStep3}
          />
        </section>
      </React.Fragment>
    );
  }
}

export default FirmwareUpgrade;