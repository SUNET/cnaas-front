import React from "react";
const io = require("socket.io-client");

class DryRunProgressInfo extends React.Component {
  state = {
    socket: null,
    logLines: []
  };

  componentDidMount(){
    const socket = io(process.env.API_URL);
    socket.on('connect', function(data) {
      console.log('Websocket connected!');
      var ret = socket.emit('logs', {'level': 'DEBUG'});
      console.log(ret)  
    });
    socket.on('cnaas_log', (data) => {
      console.log(data);
      var newLogLines = this.state.logLines;
      newLogLines.push(data + "\n");
      this.setState({logLines: newLogLines});
      var element = document.getElementById("logoutputdiv");
      element.scrollTop = element.scrollHeight;
    });
  };

  render() {
    // console.log("this is props in configchange progress data", this.props);
    let progressData = this.props.dryRunProgressData;
    let jobStatus = this.props.dryRunJobStatus;
    // console.log("this is dryRunProgressData", progressData);
    let jobStartTime = "";
    let jobFinishTime = "";
    let exceptionMessage = "";
    let log = "";
    this.state.logLines.map((logLine) => {
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
        <p>status: {jobStatus}</p>
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
