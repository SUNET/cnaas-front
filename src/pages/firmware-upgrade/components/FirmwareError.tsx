type FirmwareErrorProps = {
  readonly devices: Readonly<Record<string, { readonly failed?: boolean }>>;
};

export function FirmwareError({ devices }: FirmwareErrorProps) {
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
