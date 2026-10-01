import {
  type HTMLAttributes,
  type Key,
  type SyntheticEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { Tooltip } from "../../../../components/Tooltip";
import { useInterfaceConfig } from "../../stores/InterfaceConfigContext";
import { actions } from "../../stores/interfaceConfigReducer";
import type { Vlan } from "../../types/vlan";

const VLAN_RANGE_RE = /^\d+-\d+$/;

type VlanDropdownOption = {
  text: string;
  value: string;
  description?: string | number;
};

type UntaggedVlanOption = {
  text: string;
  value: string | null;
  description?: string | number;
};

function vlanToOption(v: Vlan): VlanDropdownOption {
  return { text: v.name, value: v.name, description: v.id };
}

function rangeToOption(range: string): VlanDropdownOption {
  return { text: `R:${range}`, value: range, description: range };
}

// Escapes RegExp special characters, mirroring lodash's escapeRegExp.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

// Shared option row layout for VLAN dropdowns: name on the left, VLAN ID
// (or range) right-aligned in muted gray — mirrors the old Semantic UI
// Dropdown's `description` field rendering.
//
// Note: MUI's own `.MuiAutocomplete-option` CSS sets `justifyContent:
// flex-start` via a compound selector that outweighs a plain `sx` override
// on specificity, so instead of fighting that we make the name span grow to
// fill the row, which pushes the description to the end regardless.
function renderVlanOptionRow(
  props: HTMLAttributes<HTMLLIElement> & { key: Key },
  text: string,
  description?: string | number,
) {
  const { key, ...rest } = props;
  return (
    <li key={key} {...rest}>
      <span style={{ flexGrow: 1 }}>{text}</span>
      {description !== undefined && (
        <Typography color="text.secondary">{description}</Typography>
      )}
    </li>
  );
}
const vlanSearchFilter = <
  T extends { text: string; description?: string | number },
>(
  options: string[],
  optionsByValue: Map<string, T>,
  inputValue: string,
) => {
  const re = new RegExp(escapeRegExp(inputValue), "i");
  return options.filter((value) => {
    const opt = optionsByValue.get(value);
    return (
      re.test(opt?.text ?? value) || re.test(String(opt?.description ?? ""))
    );
  });
};

type VlanColumnProps = {
  readonly interfaceName: string;
  readonly displayVlan: boolean;
  readonly displayVlanTagged: boolean;
  readonly displayTaggedToggle: boolean;
  readonly taggedVlanList: unknown;
  readonly untaggedVlan: unknown;
  readonly updateFieldData: (
    e: SyntheticEvent | Event,
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

  const untaggedVlanOptions = useMemo<UntaggedVlanOption[]>(
    () => [{ value: null, text: "None" }, ...vlans.map(vlanToOption)],
    [vlans],
  );

  const [rangeError, setRangeError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRangeError = (msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setRangeError(null);
    queueMicrotask(() => {
      setRangeError(msg);
      errorTimerRef.current = setTimeout(() => setRangeError(null), 5000);
    });
  };

  const handleAddVlanRange = (range: string) => {
    dispatch({ type: actions.ADD_VLAN_RANGE_OPTION, range });
  };

  if (!settings) {
    return <CircularProgress />;
  }

  if (vlanOptions.length === 0) {
    return <p>No VLANs available</p>;
  }

  if (!displayVlan) {
    return null;
  }

  return (
    <Stack direction="row" sx={{ width: "100%", minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {displayVlanTagged ? (
          <TaggedVlanSelect
            interfaceName={interfaceName}
            vlanOptions={vlanOptions}
            taggedVlanList={taggedVlanList}
            allowFreeSolo={device?.device_type === "DIST"}
            rangeError={rangeError}
            onAddVlanRange={handleAddVlanRange}
            showRangeError={showRangeError}
            updateFieldData={updateFieldData}
          />
        ) : (
          <UntaggedVlanSelect
            interfaceName={interfaceName}
            options={untaggedVlanOptions}
            untaggedVlan={untaggedVlan}
            updateFieldData={updateFieldData}
          />
        )}
      </Box>
      {displayTaggedToggle && (
        <TaggedToggle
          interfaceName={interfaceName}
          isUntagged={interfaceName in interfaceToggleUntagged}
          untaggedClick={untaggedClick}
        />
      )}
    </Stack>
  );
}

// --- Tagged VLAN multi-select (supports typing new VLAN ranges on DIST) ---

type TaggedVlanSelectProps = {
  readonly interfaceName: string;
  readonly vlanOptions: VlanDropdownOption[];
  readonly taggedVlanList: unknown;
  readonly allowFreeSolo: boolean;
  readonly rangeError: string | null;
  readonly onAddVlanRange: (range: string) => void;
  readonly showRangeError: (msg: string) => void;
  readonly updateFieldData: (
    e: SyntheticEvent | Event,
    data: Record<string, unknown>,
  ) => void;
};

function TaggedVlanSelect({
  interfaceName,
  vlanOptions,
  taggedVlanList,
  allowFreeSolo,
  rangeError,
  onAddVlanRange,
  showRangeError,
  updateFieldData,
}: TaggedVlanSelectProps) {
  const vlanOptionsByValue = useMemo(
    () => new Map(vlanOptions.map((o) => [o.value, o])),
    [vlanOptions],
  );

  const filterVlanOptions = (
    options: string[],
    filterState: { inputValue: string },
  ) => vlanSearchFilter(options, vlanOptionsByValue, filterState.inputValue);

  const normalizedTaggedVlanList = useMemo(
    () => (Array.isArray(taggedVlanList) ? taggedVlanList.map(String) : []),
    [taggedVlanList],
  );

  const handleChange = (e: SyntheticEvent, newValue: string[]) => {
    const filtered = newValue.filter((v) => {
      // Already-present values (e.g. VLAN IDs stored for DIST devices) are
      // kept as-is; only newly typed/selected entries need validating.
      if (normalizedTaggedVlanList.includes(v)) return true;
      if (vlanOptionsByValue.has(v)) return true;
      if (VLAN_RANGE_RE.test(v)) {
        onAddVlanRange(v);
        return true;
      }
      showRangeError("Only VLAN ranges (e.g. 100-200) can be added manually");
      return false;
    });
    updateFieldData(e, {
      name: `tagged_vlan_list|${interfaceName}`,
      value: filtered,
      options: vlanOptions,
    });
  };

  return (
    <Tooltip
      open={rangeError !== null}
      title={rangeError ? <Chip label={rangeError} color="error" /> : ""}
      placement="top"
    >
      <Autocomplete
        multiple
        freeSolo={allowFreeSolo}
        size="small"
        limitTags={3}
        sx={{ width: "100%", minWidth: 0 }}
        options={vlanOptions.map((o) => o.value)}
        value={normalizedTaggedVlanList}
        getOptionLabel={(value) => vlanOptionsByValue.get(value)?.text ?? value}
        filterOptions={filterVlanOptions}
        onChange={(e, newValue) => handleChange(e, newValue)}
        renderOption={(props, value) => {
          const opt = vlanOptionsByValue.get(value);
          return renderVlanOptionRow(
            props,
            opt?.text ?? value,
            opt?.description,
          );
        }}
        renderInput={(params) => (
          <TextField {...params} name={`tagged_vlan_list|${interfaceName}`} />
        )}
      />
    </Tooltip>
  );
}

// --- Untagged VLAN single select ---

type UntaggedVlanSelectProps = {
  readonly interfaceName: string;
  readonly options: UntaggedVlanOption[];
  readonly untaggedVlan: unknown;
  readonly updateFieldData: (
    e: SyntheticEvent | Event,
    data: Record<string, unknown>,
  ) => void;
};

function UntaggedVlanSelect({
  interfaceName,
  options,
  untaggedVlan,
  updateFieldData,
}: UntaggedVlanSelectProps) {
  const normalizedUntaggedVlan =
    typeof untaggedVlan === "string" ? untaggedVlan : "";
  const optionsByValue = useMemo(
    () => new Map(options.map((o) => [o.value ?? "", o])),
    [options],
  );
  const optionValues = useMemo(
    () => options.map((o) => o.value ?? ""),
    [options],
  );

  const filterUntaggedOptions = (
    opts: string[],
    filterState: { inputValue: string },
  ) => vlanSearchFilter(opts, optionsByValue, filterState.inputValue);

  return (
    <Autocomplete
      disableClearable
      size="small"
      sx={{ width: "100%", minWidth: 0 }}
      options={optionValues}
      value={normalizedUntaggedVlan}
      getOptionLabel={(value) => optionsByValue.get(value)?.text ?? value}
      filterOptions={filterUntaggedOptions}
      renderOption={(props, value) => {
        const opt = optionsByValue.get(value);
        return renderVlanOptionRow(props, opt?.text ?? value, opt?.description);
      }}
      onChange={(e, newValue) =>
        updateFieldData(e, {
          name: `untagged_vlan|${interfaceName}`,
          value: newValue === "" ? null : newValue,
          options,
        })
      }
      renderInput={(params) => (
        <TextField {...params} name={`untagged_vlan|${interfaceName}`} />
      )}
    />
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
    <ToggleButtonGroup
      orientation="vertical"
      size="small"
      exclusive
      value={isUntagged ? "untagged" : "tagged"}
      onChange={(e, value: string | null) => {
        if (value !== null) {
          untaggedClick(e, { id: interfaceName, name: value });
        }
      }}
    >
      <Tooltip title="Change untagged VLAN" placement="top-end">
        <ToggleButton value="untagged">U</ToggleButton>
      </Tooltip>
      <Tooltip title="Change list of tagged VLANs" placement="bottom-end">
        <ToggleButton value="tagged">T</ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
