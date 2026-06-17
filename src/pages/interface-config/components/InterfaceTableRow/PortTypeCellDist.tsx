import { type SyntheticEvent } from "react";
import { Dropdown, Table } from "semantic-ui-react";
import { useInterfaceConfig } from "../../stores/InterfaceConfigContext";

const IF_CLASS_OPTIONS = [
  { value: "downlink", text: "Downlink" },
  { value: "fabric", text: "Fabric link" },
  { value: "custom", text: "Custom" },
  { value: "port_template", text: "Port template" },
];

export function PortTypeCellDist({
  addPortTemplateOption,
  currentIfClass,
  editDisabled,
  item,
  portTemplate,
  updateFieldData,
}: {
  readonly item: Record<string, unknown>;
  readonly currentIfClass: string | null;
  readonly portTemplate: string | null;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addPortTemplateOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}) {
  const { state } = useInterfaceConfig();
  const portTemplateOptions = state.portTemplates.map((pt) => ({
    text: pt.name,
    value: pt.name,
    description: pt.description,
  }));

  return (
    <Table.Cell>
      <Dropdown
        key={`ifclass|${item.name}`}
        name={`ifclass|${item.name}`}
        selection
        options={IF_CLASS_OPTIONS}
        defaultValue={currentIfClass ?? undefined}
        disabled={editDisabled}
        onChange={updateFieldData}
      />
      {currentIfClass === "port_template" && (
        <Dropdown
          key={`port_template|${item.name}`}
          name={`port_template|${item.name}`}
          fluid
          selection
          search
          allowAdditions
          options={portTemplateOptions}
          defaultValue={portTemplate ?? undefined}
          disabled={editDisabled}
          onAddItem={addPortTemplateOption}
          onChange={updateFieldData}
        />
      )}
    </Table.Cell>
  );
}
