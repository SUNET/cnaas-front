import { useState } from "react";
import PropTypes from "prop-types";
import VerifyDiffResult from "../ConfigChange/VerifyDiff/VerifyDiffResult";

JobDetails.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    function_name: PropTypes.string,
    result: PropTypes.object,
    exception: PropTypes.shape({
      message: PropTypes.string,
      traceback: PropTypes.string,
    }),
  }).isRequired,
};

/**
 * Renders job-specific details based on job status and function type.
 * Used in the expanded row of the JobList table.
 */
export function JobDetails({ job }) {
  const [showTraceback, setShowTraceback] = useState(false);

  if (job.status === "EXCEPTION") {
    return (
      <ExceptionDetails
        job={job}
        showTraceback={showTraceback}
        setShowTraceback={setShowTraceback}
      />
    );
  }

  if (job.status === "FINISHED") {
    if (
      typeof job.function_name === "string" &&
      job.function_name.startsWith("sync_devices")
    ) {
      return <SyncDevicesResult job={job} />;
    }

    if (
      job.function_name === "init_access_device_step1" ||
      job.function_name === "init_fabric_device_step1"
    ) {
      return <InitDeviceResult job={job} />;
    }
  }

  // Default: show raw JSON result
  return <pre>{JSON.stringify(job.result, null, 2)}</pre>;
}

ExceptionDetails.propTypes = {
  job: PropTypes.shape({
    exception: PropTypes.shape({
      message: PropTypes.string,
      traceback: PropTypes.string,
    }),
  }).isRequired,
  showTraceback: PropTypes.bool.isRequired,
  setShowTraceback: PropTypes.func.isRequired,
};

function ExceptionDetails({ job, showTraceback, setShowTraceback }) {
  if (job.exception === undefined || job.exception === null) {
    return <p>Empty exception</p>;
  }

  return (
    <>
      <p>Exception message: {job.exception.message}</p>
      <p>
        <button
          type="button"
          className="link-button"
          onClick={() => setShowTraceback(true)}
        >
          Show exception traceback
        </button>
      </p>
      {showTraceback && <pre>{job.exception.traceback}</pre>}
    </>
  );
}

SyncDevicesResult.propTypes = {
  job: PropTypes.shape({
    result: PropTypes.shape({
      devices: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};

function SyncDevicesResult({ job }) {
  const devicesObj = job.result.devices;
  const deviceNames = Object.keys(devicesObj);
  const deviceData = Object.values(devicesObj);

  return (
    <>
      <p>Diff results:</p>
      <VerifyDiffResult deviceNames={deviceNames} deviceData={deviceData} />
    </>
  );
}

InitDeviceResult.propTypes = {
  job: PropTypes.shape({
    result: PropTypes.shape({
      devices: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};

function InitDeviceResult({ job }) {
  const deviceResult = Object.values(job.result.devices);
  const results = deviceResult[0].job_tasks
    .map((task) => {
      if (task.task_name === "napalm_get") {
        // before v1.6 failed init jobs would have napalm_get output in result and failed = false on napalm_get task
        if (
          (typeof task.result === "string" &&
            task.result.length === 0 &&
            task.failed === true) ||
          (typeof task.result === "object" && task.failed === false)
        ) {
          return "Error: Device kept old management IP";
        }
        return "New management IP set";
      }
      if (task.task_name === "Generate initial device config") {
        if (task.failed === true) {
          return `Error: Failed to generate configuration from template: ${task.result}`;
        }
        return "Configuration was generated successfully from template";
      }
      if (task.task_name === "ztp_device_cert") {
        return task.result;
      }
      // push config will have status failed pre v1.6 because timeout after changing IP, ignore failed status and look at exception type
      if (task.task_name === "Push base management config") {
        if (
          typeof task.result === "string" &&
          task.result.includes("ReplaceConfigException")
        ) {
          return `Error: Failed to push configuration: ${task.result}`;
        }
        return "Pushed base configuration";
      }
      return undefined;
    })
    .filter((result) => result !== undefined);

  return (
    <>
      {results.map((result, index) => (
        <p key={index}>{result}</p>
      ))}
    </>
  );
}
