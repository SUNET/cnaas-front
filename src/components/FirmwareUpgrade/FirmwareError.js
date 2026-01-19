export function FirmwareError({ devices }) {
  const deviceNames = Object.keys(devices);
  const deviceData = Object.values(devices);

  // Pair failing device names with their position
  const failedDeviceNameObj = deviceData
    .map((status, i) => (status.failed ? i : false))
    .filter((status) => status !== false)
    .reduce((obj, key) => {
      return {
        ...obj,
        [key]: deviceNames[key],
      };
    }, {});

  return (
    <div>
      <ul>
        {Object.values(failedDeviceNameObj).map((name, i) => (
          <li key={i}>
            <p className="error" key={`failed_dev_${i}`}>
              {name}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
