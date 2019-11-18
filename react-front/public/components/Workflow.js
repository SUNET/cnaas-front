import React from "react";

class Workflow extends React.Component {
  render() {
    console.log("hello! this is the workflow component");

    return (
      <div id="component">
        <h1>this is workflow</h1>
        <div className="workflow-container">this is box1 </div>
        <div className="workflow-container">this is box2 </div>
        <div className="workflow-container">this is box3 </div>
        <div className="workflow-container">this is box4 </div>
      </div>
    );
  }
}

export default Workflow;
