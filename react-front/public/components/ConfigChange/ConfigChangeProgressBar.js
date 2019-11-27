import React from "react";
import getData from "../../utils/getData";

class ConfigChangeProgressBar extends React.Component {
  state = {
    // token: "",
    // startJobIdSync: data.job_id,
    // deviceSyncStatus: [],
    // deviceSyncJobId: [],
    jobsData: []
    // jobStartTime: [],
    // jobFinishTime: []
    // finishedDevices: [],
    // totalDevices: []
    // errorMessage: ""
  };

  // componentDidMount() {
  //   console.log("I have mounted");
  //   console.log("this.props.jobId in progressbar component", this.props.jobId);
  //   if (this.props.jobId.length !== 0) {
  //     this.syncStatus(this.props.jobId);
  //   }
  // }

  // syncStatus = id => {
  //   // let jobId = this.props.jobId;
  //   let jobId = "5ddbe1548b2d390c963b97d8";
  //   const credentials =
  //     "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";

  //   console.log("this API call is automatic");
  //   let url = `https://tug-lab.cnaas.sunet.se:8443/api/v1.0/job/${jobId}`;
  //   getData(url, credentials).then(data => {
  //     console.log("this should be data.data.jobs", data.data.jobs);
  //     {
  //       this.setState(
  //         {
  //           jobsData: data.data.jobs
  //         },
  //         () => {
  //           console.log("this is jobs data", this.state.jobsData);
  //         }
  //       );
  //     }
  //   });
  // };
  render() {
    // let jobsData = this.state.jobsData;
    let finishedDevices = 0;
    let totalDevices = 100;
    function randomIntFromInterval(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    finishedDevices = randomIntFromInterval(0, 100);
    console.log("this is finsihedDevices", finishedDevices);
    //  totalDevices = 100;

    // let jobsProgress = jobsData.map((job, i) => {
    //   // let totalDevices = job.result._totals.selected_devices;
    //   // let jobStatus = job.status;
    //   // let finishedDevices = job.finished_devices.length;
    //   let jobStartTime = job.start_time;
    //   let jobFinishTime = job.finish_time;
    //   let exceptionText = job.exception;

    //   return (
    //     <div id="progressbar">
    //       <progress
    //         min="0"
    //         max={totalDevices}
    //         value={finishedDevices}
    //       ></progress>
    //       <label>
    //         {finishedDevices}/{totalDevices} devices finished
    //       </label>
    //       <p>Other job info</p>
    //       <p>status: {syncStatus}</p>
    //       <p>start time: {jobStartTime}</p>
    //       <p>finish time: {jobFinishTime}</p>
    //     </div>
    //   );
    // });

    return (
      <div>
        <p>Progress bar</p>
        {/* {jobsProgress} */}
        <div id="progressbar">
          <progress min="0" max="100" value={finishedDevices}></progress>
          <label>
            {finishedDevices}/{totalDevices} devices finished
          </label>
        </div>
      </div>
    );
  }
}

export default ConfigChangeProgressBar;
