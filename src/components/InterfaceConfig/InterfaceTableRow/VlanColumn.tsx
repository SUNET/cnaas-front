import _ from "lodash";
import { type SyntheticEvent, useCallback, useRef, useState } from "react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  Label,
  Loader,
  Popup,
} from "semantic-ui-react";
import { useInterfaceConfig } from "../../../store/interfaceConfig/InterfaceConfigContext";
import { actions } from "../../../store/interfaceConfig/interfaceConfigReducer";

const VLAN_RANGE_RE = /^\d+-\d+$/;

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
  const { state, dispatch } = useInterfaceConfig();
  const {
    settings,
    device,
    vlans: vlanOptions,
    untaggedVlans: untaggedVlanOptions,
    interfaceToggleUntagged,
  } = state;

  const [rangeError, setRangeError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRangeError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setRangeError(null);
    queueMicrotask(() => {
      setRangeError(msg);
      errorTimerRef.current = setTimeout(() => setRangeError(null), 5000);
    });
  }, []);

  const handleAddVlanRange = useCallback(
    (_e: SyntheticEvent, data: Record<string, unknown>) => {
      const value = String(data.value);
      if (!VLAN_RANGE_RE.test(value)) {
        showRangeError("Only VLAN ranges (e.g. 100-200) can be added manually");
        return;
      }
      dispatch({ type: actions.ADD_VLAN_RANGE_OPTION, range: value });
    },
    [dispatch, showRangeError],
  );

  const handleTaggedChange = useCallback(
    (e: SyntheticEvent, data: Record<string, unknown>) => {
      if (Array.isArray(data.value)) {
        const validValues = new Set(
          (data.options as Array<{ value: unknown }>).map((o) => o.value),
        );
        const filtered = (data.value as unknown[]).filter(
          (v) =>
            validValues.has(v) ||
            (typeof v === "string" && VLAN_RANGE_RE.test(v)),
        );
        updateFieldData(e, { ...data, value: filtered });
      } else {
        updateFieldData(e, data);
      }
    },
    [updateFieldData],
  );

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
        <Popup
          open={rangeError !== null}
          content={<Label color="red">{rangeError}</Label>}
          position="top center"
          trigger={
            <Dropdown
              key={`tagged_vlan_list|${interfaceName}`}
              name={`tagged_vlan_list|${interfaceName}`}
              fluid
              multiple
              selection
              allowAdditions={device?.device_type === "DIST"}
              onAddItem={handleAddVlanRange}
              search={vlanSearchFilter}
              options={vlanOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              defaultValue={taggedVlanList as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              onChange={handleTaggedChange}
            />
          }
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
