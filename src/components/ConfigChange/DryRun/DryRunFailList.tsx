interface DryRunFailListProps {
  readonly devices: Record<string, unknown>;
}

export function DryRunFailList({ devices }: DryRunFailListProps) {
  const failedDeviceNames = Object.entries(devices)
    .filter(
      ([, status]) =>
        status != null &&
        typeof status === "object" &&
        (status as { failed?: boolean }).failed,
    )
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
