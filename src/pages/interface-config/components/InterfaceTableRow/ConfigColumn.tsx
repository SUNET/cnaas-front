import { type SyntheticEvent, useState, type MouseEvent } from "react";
import { Button, Icon, TextArea } from "semantic-ui-react";
import Popover from "@mui/material/Popover";
import { InterfaceCurrentConfig } from "./InterfaceCurrentConfig";

type ConfigColumnProps = {
  readonly interfaceName: string;
  readonly hostname: string | null;
  readonly config: string | undefined;
  readonly currentIfClass: string | null;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function ConfigColumn({
  interfaceName,
  hostname,
  config,
  currentIfClass,
  updateFieldData,
}: ConfigColumnProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <TextArea
        name={`config|${interfaceName}`}
        defaultValue={config}
        rows={3}
        cols={50}
        hidden={currentIfClass !== "custom"}
        onChange={updateFieldData}
      />
      <Button
        compact
        size="small"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          setAnchorEl(e.currentTarget);
        }}
      >
        <Icon name="arrow alternate circle down outline" />
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <div style={{ padding: "var(--size-md)" }}>
          <p>Current running config:</p>
          <InterfaceCurrentConfig
            hostname={hostname}
            interface={interfaceName}
          />
        </div>
      </Popover>
    </>
  );
}
