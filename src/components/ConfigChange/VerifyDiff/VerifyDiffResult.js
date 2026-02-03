import PropTypes from "prop-types";
import { useMemo } from "react";
import SyntaxHighlight from "../../SyntaxHighlight";

VerifyDiffResult.propTypes = {
  deviceNames: PropTypes.array,
  deviceData: PropTypes.array,
};

function VerifyDiffResult({ deviceNames, deviceData }) {
  // Extract diffs from device data
  const deviceDiffs = useMemo(() => {
    return deviceData
      .map((jobsObj, i) => {
        const diffs = jobsObj.job_tasks
          .map((task) => task.diff)
          .filter((diff) => diff !== "")
          .join("");

        return diffs ? { name: deviceNames[i], diff: diffs } : null;
      })
      .filter(Boolean); // Remove null entries
  }, [deviceData, deviceNames]);

  // Extract exceptions from device data
  const deviceExceptions = useMemo(() => {
    return deviceData
      .map((jobsObj, i) => {
        const failedTasks = jobsObj.job_tasks.filter(
          (task) => task.failed === true,
        );

        if (failedTasks.length === 0) return null;

        return {
          name: deviceNames[i],
          result: failedTasks[0]?.result, // Take first failed task
        };
      })
      .filter(Boolean); // Remove null entries
  }, [deviceData, deviceNames]);

  const hasEmptyDiffs = deviceData?.length > 0 && deviceDiffs.length === 0;

  return (
    <div>
      <section className="diff-box">
        <ul>
          {hasEmptyDiffs ? (
            <li>
              <p>All devices returned empty diffs</p>
            </li>
          ) : (
            deviceDiffs.map((device, i) => (
              <li key={`${device.name}-${i}`}>
                <p className="device-name">{device.name} diffs</p>
                <SyntaxHighlight
                  index={i}
                  syntaxLanguage="language-diff diff-highlight"
                  code={device.diff}
                />
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="diff-box">
        <ul>
          {deviceExceptions.map((device, i) => (
            <li key={`${device.name}-exception-${i}`}>
              <p className="device-name">{device.name} failed result</p>
              <pre className="traceback">{device.result}</pre>
              <pre className="exception">
                {device.result.split("\n").slice(-2).join("\n")}
              </pre>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default VerifyDiffResult;
