import React from "react";
import ConfigChangeStep1 from "./ConfigChangeStep1";
import ConfigChangeStep2 from "./ConfigChangeStep2";
import ConfigChangeStep3 from "./ConfigChangeStep3";
import ConfigChangeStep4 from "./ConfigChangeStep4";

class ConfigChange extends React.Component {
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
        <ConfigChangeStep1 />
        <ConfigChangeStep2 />
        <ConfigChangeStep3 />
        <ConfigChangeStep4 />
      </section>
    );
  }
}

export default ConfigChange;
