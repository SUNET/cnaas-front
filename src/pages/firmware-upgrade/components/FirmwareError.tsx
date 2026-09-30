import Typography from "@mui/material/Typography";

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
            <Typography color="error">{name}</Typography>
          </li>
        ))}
      </ul>
    </div>
  );
}
