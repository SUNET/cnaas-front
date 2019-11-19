import React from "react";
import Workflow_step1 from "./Workflow_step1";
import Workflow_step2 from "./Workflow_step2";

class Workflow extends React.Component {
  state = {
    // token: "",
    // commitInfo: [],
    // latestCommitInfo: []
    // errorMessage: ""
  };

  render() {
    // console.log("hello! this is the workflow component");
    // console.log("these are props (in Workflow)", this.props);
    return (
      <section>
        <h1>Commit changes workflow</h1>
        <Workflow_step1 />
        <Workflow_step2 />
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Verify difference (3/4)</h2>
            <a href="#">
              <button className="workflow-container__button--hide">Close</button>
            </a>
          </div>
          <div className="workflow-collapsable">
            <p>
              this is box3 this will display results from step 2 and 2 buttons
            </p>
          </div>
        </div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Commit configuration (4/4)</h2>
            <a href="#">
              <button className="workflow-container__button--hide">Close</button>
            </a>
          </div>
          <div className="workflow-collapsable">
            <p>this is box4 </p>
          </div>
        </div>
      </section>
    );
  }
}

export default Workflow;
