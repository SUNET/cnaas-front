import { type SyntheticEvent } from "react";
import { Button, Icon, Popup, TextArea } from "semantic-ui-react";
import { InterfaceCurrentConfig } from "./InterfaceCurrentConfig";

interface ConfigColumnProps {
  readonly interfaceName: string;
  readonly hostname: string | null;
  readonly config: string | undefined;
  readonly currentIfClass: string | null;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

export function ConfigColumn({
  interfaceName,
  hostname,
  config,
  currentIfClass,
  updateFieldData,
}: ConfigColumnProps) {
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
      <Popup
        on="click"
        pinned
        position="top right"
        trigger={
          <Button compact size="small">
            <Icon name="arrow alternate circle down outline" />
          </Button>
        }
      >
        <p>Current running config:</p>
        <InterfaceCurrentConfig hostname={hostname} interface={interfaceName} />
      </Popup>
    </>
  );
}
