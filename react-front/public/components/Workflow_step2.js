import React from "react";
import checkResponseStatus from "../utils/checkResponseStatus";
//WORK IN PROGRESS

class Workflow_step2 extends React.Component {
  state = {
    // token: "",
    // errorMessage: ""
  };

  render() {
    // console.log("hello! this is the workflow component");
    // console.log("these are props (in Workflow)", this.props);
    return (
      <div className="workflow-container">
        <div className="workflow-container__header">
          <h2>Dry run (2/4)</h2>
          <a href="#">
            <button className="workflow-container__button--hide">Close</button>
          </a>
        </div>
        <div className="workflow-collapsable">
          <p>
            this is box2 and it will hold text, button to get progressbar data,
            display final response, three buttons
          </p>
        </div>
      </div>
    );
  }
}

export default Workflow_step2;
