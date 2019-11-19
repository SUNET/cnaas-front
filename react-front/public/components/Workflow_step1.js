import React from "react";

class Workflow_step1 extends React.Component {
  state = {
    // token: "",
    commitInfo: [],
    latestCommitInfo: []
    // errorMessage: ""
  };

  // here we check the status of the response and only process the result if status is 200
  checkStatus = response => {
    console.log("we have response");
    console.log("response status:", response.status);
    if (response.status === 200) {
      console.log("response 200");
      return Promise.resolve(response);
    } else if (response.status === 400 || response.status === 401) {
      this.setState({
        errorMessage: "Your details were not recognised. Try again!"
      });
    } else if (response.staus === 500) {
      this.setState({
        errorMessage: "Something went wrong on our end. Try again later."
      });
    }
  };

  getCommitInfo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    console.log("you clicked the get commit info button");
    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/repository/settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials}`
      }
    })
      .then(response => this.checkStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              commitInfo: data.data
            },
            () => {
              console.log("this is new state", this.state.commitInfo);
            }
          );
        }
      });
  };

  // this request takes some time, perhaps work in a "loading..."
  refreshCommitInfo = () => {
    const credentials =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE1NzEwNTk2MTgsIm5iZiI6MTU3MTA1OTYxOCwianRpIjoiNTQ2MDk2YTUtZTNmOS00NzFlLWE2NTctZWFlYTZkNzA4NmVhIiwic3ViIjoiYWRtaW4iLCJmcmVzaCI6ZmFsc2UsInR5cGUiOiJhY2Nlc3MifQ.Sfffg9oZg_Kmoq7Oe8IoTcbuagpP6nuUXOQzqJpgDfqDq_GM_4zGzt7XxByD4G0q8g4gZGHQnV14TpDer2hJXw";
    console.log("you clicked the refresh commit info button");
    fetch("https://tug-lab.cnaas.sunet.se:8443/api/v1.0/repository/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify({ action: "REFRESH" })
    })
      .then(response => this.checkStatus(response))
      .then(response => response.json())
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              latestCommitInfo: data.data
            },
            () => {
              console.log("this is new state", this.state.latestCommitInfo);
            }
          );
        }
      });
  };

  render() {
    // console.log("hello! this is the workflow component");
    // console.log("these are props (in Workflow)", this.props);
    console.log("this is repo data (in Workflow)", this.state.commitInfo);
    let commitInfo = this.state.commitInfo;
    let refreshedCommitInfo = this.state.latestCommitInfo;
    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Refresh repositories (1/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <div className="workflow-collapsable__button-result">
            <button onClick={this.getCommitInfo}> See latest commit </button>
            <p>{commitInfo}</p>
          </div>
          <div className="workflow-collapsable__button-result">
            <button onClick={this.refreshCommitInfo}>
              Refresh commit info
            </button>
            <p>{refreshedCommitInfo}</p>
          </div>
          {/* <p>this is box1 and it will hold 2 buttons</p> */}
        </div>
      </div>
    );
  }
}

export default Workflow_step1;
