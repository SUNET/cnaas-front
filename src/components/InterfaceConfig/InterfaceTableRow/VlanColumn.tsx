import _ from "lodash";
import { type SyntheticEvent } from "react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  Loader,
  Popup,
} from "semantic-ui-react";
import { useInterfaceConfig } from "../../../store/interfaceConfig/InterfaceConfigContext";

// Shared search filter for VLAN dropdowns — searches both text and description
const vlanSearchFilter = ((
  filteredOptions: Array<{ text: string; description?: unknown }>,
  searchQuery: string,
) => {
  const re = new RegExp(_.escapeRegExp(searchQuery), "i");
  return _.filter(
    filteredOptions,
    (opt) => re.test(opt.text) || re.test(opt.description?.toString() ?? ""),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

interface VlanColumnProps {
  readonly interfaceName: string;
  readonly displayVlan: boolean;
  readonly displayVlanTagged: boolean;
  readonly displayTaggedToggle: boolean;
  readonly taggedVlanList: unknown;
  readonly untaggedVlan: unknown;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly untaggedClick: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

export function VlanColumn({
  interfaceName,
  displayVlan,
  displayVlanTagged,
  displayTaggedToggle,
  taggedVlanList,
  untaggedVlan,
  updateFieldData,
  untaggedClick,
}: VlanColumnProps) {
  const { state } = useInterfaceConfig();
  const {
    settings,
    vlans: vlanOptions,
    untaggedVlans: untaggedVlanOptions,
    interfaceToggleUntagged,
  } = state;

  if (!settings) {
    return <Loader inline active />;
  }

  if (vlanOptions.length === 0) {
    return <p>No VLANs available</p>;
  }

  if (!displayVlan) {
    return null;
  }

  return (
    <>
      {displayVlanTagged ? (
        <Dropdown
          key={`tagged_vlan_list|${interfaceName}`}
          name={`tagged_vlan_list|${interfaceName}`}
          fluid
          multiple
          selection
          search={vlanSearchFilter}
          options={vlanOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          defaultValue={taggedVlanList as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onChange={updateFieldData}
        />
      ) : (
        <Dropdown
          key={`untagged_vlan|${interfaceName}`}
          name={`untagged_vlan|${interfaceName}`}
          fluid
          selection
          search={vlanSearchFilter}
          options={untaggedVlanOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          defaultValue={untaggedVlan as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onChange={updateFieldData}
        />
      )}
      {displayTaggedToggle && (
        <TaggedToggle
          interfaceName={interfaceName}
          isUntagged={interfaceName in interfaceToggleUntagged}
          untaggedClick={untaggedClick}
        />
      )}
    </>
  );
}

// --- Tagged/Untagged toggle buttons ---

interface TaggedToggleProps {
  readonly interfaceName: string;
  readonly isUntagged: boolean;
  readonly untaggedClick: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

function TaggedToggle({
  interfaceName,
  isUntagged,
  untaggedClick,
}: TaggedToggleProps) {
  return (
    <ButtonGroup size="mini" vertical>
      <Popup
        content="Change untagged VLAN"
        position="top right"
        trigger={
          <Button
            id={interfaceName}
            name="untagged"
            onClick={untaggedClick}
            active={isUntagged}
            className="table-button-compact"
          >
            U
          </Button>
        }
      />
      <Popup
        content="Change list of tagged VLANs"
        position="bottom right"
        trigger={
          <Button
            id={interfaceName}
            name="tagged"
            onClick={untaggedClick}
            active={!isUntagged}
            className="table-button-compact"
          >
            T
          </Button>
        }
      />
    </ButtonGroup>
  );
}
