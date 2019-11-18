import React from "react";

class Workflow extends React.Component {
  render() {
    console.log("hello! this is the workflow component");

    return (
      <section>
        <h1>Commit changes workflow</h1>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Refresh repositories (1/4)</h2>
            <a href="#">
              <button className="workflow-container__button">Close</button>
            </a>
          </div>
          <div className="workflow-container__secondary">
            <p>this is box1 and it will hold 2 buttons</p>
          </div>
        </div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Dry run (2/4)</h2>
            <a href="#">
              <button className="workflow-container__button">Close</button>
            </a>
          </div>
          <div className="workflow-container__secondary">
            <p>
              this is box2 and it will hold text, button to get progressbar
              data, display final response, three buttons
            </p>
          </div>
        </div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Verify difference (3/4)</h2>
            <a href="#">
              <button className="workflow-container__button">Close</button>
            </a>
          </div>
          <div className="workflow-container__secondary">
            <p>this is box3 this will display results from step 2 and 2 buttons</p>
          </div>
        </div>
        <div className="workflow-container">
          <div className="workflow-container__header">
            <h2>Commit configuration (4/4)</h2>
            <a href="#">
              <button className="workflow-container__button">Close</button>
            </a>
          </div>
          <div className="workflow-container__secondary">
            <p>this is box4 </p>
          </div>
        </div>
      </section>
    );
  }
}

export default Workflow;
