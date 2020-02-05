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
    console.log("dry run will sync");
    const credentials = this.state.token;
    // let url = "https://tug-lab.cnaas.sunet.se:8443/api/v1.0/device_syncto";
    let url = "https://mdh.cnaas.sunet.se/api/v1.0/device_syncto";
    // let dataToSend = { dry_run: true, all: true };
    let dataToSend = { dry_run: true, hostname: "esk-d11351-a1" };
    console.log("this is url", url);
    // if (e.target.id === "force-button") {
    //   dataToSend = { dry_run: true, all: true, force: true };
    // } else if (e.target.id === "confirm") {
    //   console.log("you pressed confirm");
    // dataToSend = { dry_run: false, all: true, force: true };
    // }
    console.log("now it will post the data");
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
    let jobId = this.state.dryRunSyncData.job_id;
    console.log("this is jobID:", jobId);
    const credentials = this.state.token;
    // let url = `https://tug-lab.cnaas.sunet.se:8443/api/v1.0/job/${jobId}`;
    let url = `https://mdh.cnaas.sunet.se/api/v1.0/job/${jobId}`;
    this.repeatingJobData = setInterval(() => {
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
        <ConfigChangeStep3
          dryRunChangeScore={dryRunChangeScore}
          devices={dryRunResults}
        />
        <ConfigChangeStep4 dryRunSyncStart={this.dryRunSyncStart} />
      </section>
    );
  }
}

export default ConfigChange;
