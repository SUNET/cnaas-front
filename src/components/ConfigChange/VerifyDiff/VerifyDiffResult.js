import PropTypes from "prop-types";
import { useMemo } from "react";
import SyntaxHighlight from "../../SyntaxHighlight";

VerifyDiffResult.propTypes = {
  deviceNames: PropTypes.arrayOf(PropTypes.string),
  deviceData: PropTypes.arrayOf(
    PropTypes.shape({
      job_tasks: PropTypes.arrayOf(
        PropTypes.shape({
          task_name: PropTypes.string,
          result: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
          failed: PropTypes.bool,
          diff: PropTypes.string,
        }),
      ),
    }),
  ),
};

const ignoreTaskNames = new Set(["push_sync_device"]);

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
          (task) =>
            task.failed === true && !ignoreTaskNames.has(task.task_name),
        );

        if (failedTasks.length === 0) return null;

        return {
          name: deviceNames[i],
          tasks: failedTasks.map((task) => ({
            task_name: task.task_name,
            result: task.result,
          })),
        };
      })
      .filter(Boolean); // Remove null entries
  }, [deviceData, deviceNames]);

  const hasEmptyDiffs = deviceData?.length > 0 && deviceDiffs.length === 0;
  const hasFailures = deviceExceptions.length > 0;
  const showEmptyDiffsMessage = hasEmptyDiffs && !hasFailures;

  return (
    <div>
      <section className="diff-box">
        <ul>
          {showEmptyDiffsMessage ? (
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
          {deviceExceptions.map((device) => (
            <li key={device.name}>
              <p className="device-name">{device.name} failed result</p>
              {device.tasks.map((task) => (
                <div key={task.task_name}>
                  <pre className="exception">
                    {task.result?.split("\n").slice(-2).join("\n")}
                  </pre>
                  <details>
                    <summary>Show full traceback</summary>
                    <pre className="traceback">{task.result}</pre>
                  </details>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default VerifyDiffResult;
