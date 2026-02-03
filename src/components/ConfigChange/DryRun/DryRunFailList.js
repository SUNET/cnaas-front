import PropTypes from "prop-types";

DryRunFailList.propTypes = {
  devices: PropTypes.object.isRequired,
};

export function DryRunFailList({ devices }) {
  const failedDeviceNames = Object.entries(devices)
    .filter(([, status]) => status.failed)
    .map(([name]) => name);

  return (
    <div>
      <ul>
        {failedDeviceNames.map((name) => (
          <li key={name}>
            <p className="error">{name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
