import React from "react";

class Workflow extends React.Component {
  render() {
    console.log("hello! this is the workflow component");

    return (
      <section>
        <h1>Commit changes workflow</h1>
        <div className="workflow-container__primary">
          <div className="workflow-container__header">
            <h2>Refresh repositories (1/4)</h2>
            <button className="workflow-container__button">
              <a className="workflow-container__button-link" href="#">
                Close
              </a>
            </button>
          </div>
          <div className="workflow-container__secondary">
            <p>this is box1 and it will hold 2 buttons</p>
          </div>
        </div>
        <div className="workflow-container__primary">
          <h2>Dry run (2/4)</h2>
          <div className="workflow-container__secondary">
            <p>
              this is box2 and it will hold text, button to get progressbar
              data, display final response, three buttons
            </p>
          </div>
        </div>
        <div className="workflow-container__primary">
          <h2>Verify difference (3/4)</h2>
          <div className="workflow-container__secondary">
            <p>this is box3 this will display results form</p>
          </div>
        </div>
        <div className="workflow-container__primary">
          <h2>Commit configuration (4/4)</h2>
          <div className="workflow-container__secondary">
            <p>this is box4</p>
          </div>
        </div>
      </section>
    );
  }
}

export default Workflow;
