import React from "react";
const io = require("socket.io-client");

class DryRunProgressInfo extends React.Component {
  state = {
    socket: null,
    logLines: [],
    jobId: null
  };

  checkJobId(job_id) {
    return function(logLine) {
      return logLine.toLowerCase().includes("job #"+job_id);
    }
  };

  componentDidMount(){
    const credentials = localStorage.getItem("token");
    const socket = io(process.env.API_URL, {query: {jwt: credentials}});
    socket.on('connect', function(data) {
      console.log('Websocket connected!');
      var ret = socket.emit('events', {'loglevel': 'DEBUG'});
//      var ret = socket.emit('events', {'update': 'job'});
      console.log(ret)  
    });
    socket.on('events', (data) => {
      var newLogLines = this.state.logLines;
      if (newLogLines.length >= 1000) {
        newLogLines.shift();
      }
      newLogLines.push(data + "\n");
      this.setState({logLines: newLogLines});
      var element = document.getElementById("logoutputdiv");
      if (element !== undefined) {
        element.scrollTop = element.scrollHeight;
      }
    });
  };

  render() {
    // console.log("this is props in configchange progress data", this.props);
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    let jobId = this.props.jobId;
    // console.log("this is dryRunProgressData", progressData);
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";
    let log = "";
    this.state.logLines.filter(this.checkJobId(jobId)).map((logLine) => {
      log = log + logLine;
    })

    progressData.map((job, i) => {
      jobStartTime = job.start_time;
      jobFinishTime = job.finish_time;
      if (jobStatus === "EXCEPTION") {
        exceptionMessage = job.exception.message;
      }
    });

    return (
      <div key="1">
        <p>status: {jobStatus} (job #{jobId})</p>
        <p className="error">{exceptionMessage}</p>
        <p>start time: {jobStartTime}</p>
        <p>finish time: {jobFinishTime}</p>
        <div id="logoutputdiv" className="logoutput">
          <pre>
            {log}
          </pre>
        </div>
      </div>
    );
  }
}

export default DryRunProgressInfo;
