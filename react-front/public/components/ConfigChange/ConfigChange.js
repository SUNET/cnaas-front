import React from "react";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import ConfigChangeStep2 from "./ConfigChangeStep2";
import ConfigChangeStep3 from "./ConfigChangeStep3";
import ConfigChangeStep4 from "./ConfigChangeStep4";

import { postData } from "../../utils/sendData";
import getData from "../../utils/getData";

class ConfigChange extends React.Component {
  state = {
    token:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw",
    dryRunSyncData: [],
    dryRunSyncJobid: null,
    dryRunProgressData: [],
    dryRunResultData: []
    // errorMessage: ""
  };

  dryRunSyncStart = e => {
    const credentials = this.state.token;
    let url = "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device_syncto";
    let dataToSend = { dry_run: true, all: true };
    if (e.target.id === "force-button") {
      dataToSend = { dry_run: true, all: true, force: true };
    }
    // console.log("this is whats used in func", dataToSend);
    postData(url, credentials, dataToSend).then(data => {
      console.log("this should be data", data);
      {
        this.setState(
          {
            dryRunSyncData: data
          },
          () => {
            this.pollJobStatus();
          },
          () => {
            console.log("this is new state", this.state.dryRunSyncData);
          }
        );
      }
    });
  };

  pollJobStatus = () => {
    // job id leading to finish / some devices failing / no diff
    // use jobId from API in url
    // let jobId = this.state.dryRunSyncData.job_id;
    // let jobId = "16";
    // job id leading to finish
    // let jobId = "5ddbe1548b2d390c963b97d8";
    // job id leading to finish / diff
    let jobId = "5";
    // let jobId = "5de8d5608b2d394fe74709a0";
    // job id leading to exception
    // let jobId = "12";
    // let jobId = "5de8d5608b2d394fe74709b0"
    const credentials = this.state.token;
    let url = `https://tug-lab.cnaas.sunet.se:8443/api/v1.0/job/${jobId}`;
    this.repeatingJobData = setInterval(() => {
      // console.log("start interval on:", jobId);
      getData(url, credentials).then(data => {
        console.log("this should be data.data.jobs", data.data.jobs);
        {
          this.setState({
            dryRunProgressData: data.data.jobs
          });
        }
      });
    }, 500);
  };

  render() {
    let dryRunProgressData = this.state.dryRunProgressData;
    let dryRunJobStatus = "";
    let dryRunResults = "";
    let dryRunChangeScore = "";
    dryRunProgressData.map((job, i) => {
      dryRunJobStatus = job.status;
      dryRunChangeScore = job.change_score;
    });

    if (dryRunJobStatus === "FINISHED" || dryRunJobStatus === "EXCEPTION") {
      clearInterval(this.repeatingJobData);
      if (dryRunJobStatus === "FINISHED") {
        dryRunProgressData.map((job, i) => {
          dryRunResults = job.result.devices;
        });
      }
    }

    // console.log("hello! this is the workflow component");
    // console.log("these are props (in Workflow)", this.props);
    return (
      <section>
        <h1>Commit changes workflow</h1>
        <ConfigChangeStep1 />
        <ConfigChangeStep2
          dryRunSyncStart={this.dryRunSyncStart}
          dryRunProgressData={dryRunProgressData}
          dryRunJobStatus={dryRunJobStatus}
          devices={dryRunResults}
        />
        <ConfigChangeStep3 />
        <ConfigChangeStep4 />
      </section>
    );
  }
}

export default ConfigChange;
