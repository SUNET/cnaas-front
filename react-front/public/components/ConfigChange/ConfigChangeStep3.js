import React from "react";

class ConfigChangeStep3 extends React.Component {
  render() {
    return (
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
    );
  }
}

export default ConfigChangeStep3;
