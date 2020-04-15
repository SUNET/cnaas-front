import React from "react";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import DryRun from "./DryRun/DryRun";
import VerifyDiff from "./VerifyDiff/VerifyDiff";
import ConfigChangeStep4 from "./ConfigChangeStep4";
import checkResponseStatus from "../../utils/checkResponseStatus";
// import { postData } from "../../utils/sendData";
import getData from "../../utils/getData";

class ConfigChange extends React.Component {
  state = {
    dryRunSyncData: [],
    dryRunSyncJobid: null,
    dryRunProgressData: [],
    dryRunResultData: [],
    totalCount: 0
    // errorMessage: ""
  };

  readHeaders = response => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log("total: " + totalCountHeader);
      this.setState({ totalCount: totalCountHeader });
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
    return response;
  };

  dryRunSyncStart = (e, options) => {
    console.log("dry run will sync");
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_syncto";
    let dataToSend = { dry_run: true, all: true };
    // let dataToSend = { dry_run: true, hostname: "esk-d11351-a1" };
   
    if (e.target.id === "force-button") {
      dataToSend = { dry_run: true, all: true, force: true };
    } 
    else if (e.target.id === "confirm") {
      window.confirm("Really push config?")
      console.log("you pressed confirm");
    // dataToSend = { dry_run: false, all: true, force: true };
    }
    if (options === undefined) options = {};
    if (options.resync !== undefined) {
      dataToSend["resync"] = options.resync;
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
      .then(response => this.readHeaders(response))
      .then(response => response.json())
      .then(data => {
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
    // let jobId = 1448;
    // let jobId = 1560;
    // console.log("this is jobID:", jobId);
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + `/api/v1.0/job/${jobId}`;
    this.repeatingJobData = setInterval(() => {
      getData(url, credentials).then(data => {
        console.log("this should be data.data.jobs", data.data.jobs);
        {
          this.setState({
            dryRunProgressData: data.data.jobs
          });
        }
      });
    }, 700);
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
        var confirmButtonElem = document.getElementById("confirm");
        confirmButtonElem.disabled = false;
      }
    }

    return (
      <section>
        <h1>Commit changes task</h1>
        <ConfigChangeStep1 />
        <DryRun
          dryRunSyncStart={this.dryRunSyncStart}
          dryRunProgressData={dryRunProgressData}
          dryRunJobStatus={dryRunJobStatus}
          devices={dryRunResults}
          totalCount={this.state.totalCount}
        />
        <VerifyDiff
          dryRunChangeScore={dryRunChangeScore}
          devices={dryRunResults}
        />
        <ConfigChangeStep4 dryRunSyncStart={this.dryRunSyncStart} />
      </section>
    );
  }
}

export default ConfigChange;
