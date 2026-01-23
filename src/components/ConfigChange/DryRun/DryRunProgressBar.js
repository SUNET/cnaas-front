import ProgressBar from "../../ProgressBar";

import PropTypes from "prop-types";

DryRunProgressBar.propTypes = {
  dryRunProgressData: PropTypes.object,
  dryRunJobStatus: PropTypes.string,
  totalDevices: PropTypes.number,
  keyNum: PropTypes.number,
};

DryRunProgressBar.defaultProps = {
  hidden: false,
  keyNum: 1,
};

export function DryRunProgressBar({
  dryRunProgressData,
  dryRunJobStatus,
  hidden,
  totalDevices,
  keyNum,
}) {
  const isActiveJob =
    dryRunJobStatus === "RUNNING" || dryRunJobStatus === "FINISHED";
  const finishedDevicesNum = isActiveJob
    ? (dryRunProgressData?.finished_devices?.length ?? 0)
    : 0;

  return (
    <ProgressBar
      hidden={hidden}
      value={finishedDevicesNum}
      total={totalDevices}
      jobStatus={dryRunJobStatus}
      key={200 + keyNum}
    />
  );
}
