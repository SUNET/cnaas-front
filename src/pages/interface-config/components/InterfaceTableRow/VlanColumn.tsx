import _ from "lodash";
import {
  type SyntheticEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  Label,
  Loader,
} from "semantic-ui-react";
import { NmsTooltip } from "../../../../components/NmsTooltip";
import { useInterfaceConfig } from "../../stores/InterfaceConfigContext";
import { actions } from "../../stores/interfaceConfigReducer";
import type { Vlan } from "../../types/vlan";

const VLAN_RANGE_RE = /^\d+-\d+$/;

type VlanDropdownOption = {
  key?: string | number;
  text: string;
  value: string | null;
  description?: string | number;
};

function vlanToOption(v: Vlan): VlanDropdownOption {
  return { key: v.vni, text: v.name, value: v.name, description: v.id };
}

function rangeToOption(range: string): VlanDropdownOption {
  return { text: `R:${range}`, value: range, description: range };
}

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

type VlanColumnProps = {
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
};

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
  const { settings, device, vlans, vlanRanges, interfaceToggleUntagged } =
    state;

  const vlanOptions = useMemo<VlanDropdownOption[]>(
    () => [
      ...vlans.map(vlanToOption),
      ...Array.from(vlanRanges, rangeToOption),
    ],
    [vlans, vlanRanges],
  );

  const untaggedVlanOptions = useMemo<VlanDropdownOption[]>(
    () => [{ value: null, text: "None" }, ...vlans.map(vlanToOption)],
    [vlans],
  );

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
        <NmsTooltip
          open={rangeError !== null}
          title={rangeError ? <Label color="red">{rangeError}</Label> : ""}
          placement="top"
        >
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
        </NmsTooltip>
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

type TaggedToggleProps = {
  readonly interfaceName: string;
  readonly isUntagged: boolean;
  readonly untaggedClick: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

function TaggedToggle({
  interfaceName,
  isUntagged,
  untaggedClick,
}: TaggedToggleProps) {
  return (
    <ButtonGroup size="mini" vertical>
      <NmsTooltip title="Change untagged VLAN" placement="top-end">
        <Button
          id={interfaceName}
          name="untagged"
          onClick={untaggedClick}
          active={isUntagged}
          className="table-button-compact"
        >
          U
        </Button>
      </NmsTooltip>
      <NmsTooltip title="Change list of tagged VLANs" placement="bottom-end">
        <Button
          id={interfaceName}
          name="tagged"
          onClick={untaggedClick}
          active={!isUntagged}
          className="table-button-compact"
        >
          T
        </Button>
      </NmsTooltip>
    </ButtonGroup>
  );
}
