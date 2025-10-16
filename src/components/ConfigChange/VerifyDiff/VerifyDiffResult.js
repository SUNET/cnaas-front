import React from "react";
import SyntaxHighlight from "../../SyntaxHighlight";

class VerifyDiffResult extends React.Component {
  render() {
    // console.log("these are props in step 3", this.props);
    const { deviceNames } = this.props;
    const { deviceData } = this.props;

    // creates a 2D array that pairs device name and their diff
    const deviceNameAndDiffArray = deviceData.map((jobsObj, i) => {
      const jobTasks = jobsObj.job_tasks;
      return jobTasks
        .map((subTasks) => {
          return subTasks.diff;
        })
        .filter((diff) => diff !== "")
        .reduce((arr, diff) => {
          return [deviceNames[i], diff];
        }, []);
    });
    // renders name and diff values in the array
    let deviceNameAndDiffList = deviceNameAndDiffArray.map(
      (nameAndDiffArray, i) => {
        if (nameAndDiffArray[0] !== undefined) {
          return (
            <li key={i}>
              <p className="device-name" key={i}>
                {nameAndDiffArray[0]} diffs
              </p>
              <SyntaxHighlight
                index={i}
                syntaxLanguage="language-diff diff-highlight"
                code={nameAndDiffArray[1]}
              />
            </li>
          );
        }
      },
    );
    // Check if we get a result back, but the result contains only empty diffs
    if (
      deviceData?.length !== 0 &&
      (deviceNameAndDiffList === undefined ||
        (deviceNameAndDiffList.length === 1 &&
          deviceNameAndDiffList[0] === undefined))
    ) {
      deviceNameAndDiffList = (
        <li>
          <p>All devices returned empty diffs</p>
        </li>
      );
    }    // creates a 2D array that pairs device name and their exceptions
    const deviceNameAndExceptionArray = deviceData.map((jobsObj, i) => {
      const jobTasks = jobsObj.job_tasks;
      return jobTasks
        .filter((subTask) => subTask.failed === true)
        .map((subTasks) => {
          return subTasks.result;
        })
        .reduce((arr, result) => {
          return [deviceNames[i], result];
        }, []);
    });
    // renders name and diff values in the array
    const deviceNameAndExceptionList = deviceNameAndExceptionArray.map(
      (nameAndExceptionArray, i) => {
        if (nameAndExceptionArray[0] !== undefined) {
          return (
            <li key={i}>
              <p className="device-name" key={i}>
                {nameAndExceptionArray[0]} failed result
              </p>
              <pre className="traceback">{nameAndExceptionArray[1]}</pre>
              <pre className="exception">
                {nameAndExceptionArray[1].split("\n").slice(-2).join("\n")}
              </pre>
            </li>
          );
        }
      },
    );

    return (
      <div>
        <div id="diff-box">
          <ul>{deviceNameAndDiffList}</ul>
        </div>
        <div id="diff-box">
          <ul>{deviceNameAndExceptionList}</ul>
        </div>
      </div>
    );
  }
}

export default VerifyDiffResult;
