import React from "react";
import Prism from "prismjs";

import "../../../../node_modules/prismjs/components/prism-diff.min.js";
import "../../../styles/prism.css";

class VerifyDiffResult extends React.Component {
  componentDidMount() {
    Prism.highlightAll();
  }
  render() {
    // console.log("these are props in step 3", this.props);
    const deviceNames = this.props.deviceNames;
    const deviceData = this.props.deviceData;

    // creates a 2D array that pairs device name and their diff
    const deviceNameAndDiffArray = deviceData.map((jobsObj, i) => {
      const jobTasks = jobsObj.job_tasks;
      return jobTasks
        .map((subTasks, i) => {
          return subTasks.diff;
        })
        .filter(diff => diff !== "")
        .reduce((arr, diff, i) => {
          return [deviceNames[i], diff];
        }, []);
    });
    // renders name and diff values in the array
    const deviceNameAndDiffList = deviceNameAndDiffArray.map(
      (nameAndDiffArray, i) => {
        console.log("this is nameAndDiffObj", nameAndDiffArray);
        return (
          <li key={i}>
            <p className="device-name" key={i}>
              {nameAndDiffArray[0]}
            </p>
            <pre className="diff-highlight" key={i + 1}>
              <code className="language-diff diff-highlight">
                {nameAndDiffArray[1]}
              </code>
            </pre>
          </li>
        );
      }
    );

    return (
      <div id="diff-box">
        <ul>{deviceNameAndDiffList}</ul>
      </div>
    );
  }
}

export default VerifyDiffResult;
