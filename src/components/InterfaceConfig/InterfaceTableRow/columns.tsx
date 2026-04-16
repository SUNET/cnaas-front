import { type SyntheticEvent } from "react";
import { Checkbox, Dropdown, Icon, Input, Popup } from "semantic-ui-react";
import type { DropdownOption } from "../../../store/interfaceConfig/interfaceConfigReducer";

// --- Tags column ---

interface TagsColumnProps {
  readonly interfaceName: string;
  readonly tags: string[];
  readonly editDisabled: boolean;
  readonly tagOptions: DropdownOption[];
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addTagOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

export function TagsColumn({
  interfaceName,
  tags,
  editDisabled,
  tagOptions,
  updateFieldData,
  addTagOption,
}: TagsColumnProps) {
  return (
    <Dropdown
      name={`tags|${interfaceName}`}
      fluid
      multiple
      selection
      search
      allowAdditions
      options={tagOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
      defaultValue={tags}
      onAddItem={addTagOption}
      onChange={updateFieldData}
      disabled={editDisabled}
    />
  );
}

// --- JSON column ---

interface JsonColumnProps {
  readonly data: Record<string, unknown> | undefined;
}

export function JsonColumn({ data }: JsonColumnProps) {
  if (!data) return null;

  return (
    <Popup
      header="Raw JSON data"
      content={JSON.stringify(data)}
      position="top right"
      wide
      hoverable
      trigger={<Icon color="grey" name="ellipsis horizontal" />}
    />
  );
}

// --- Aggregate ID column ---

interface AggregateIdColumnProps {
  readonly interfaceName: string;
  readonly aggregateId: unknown;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

export function AggregateIdColumn({
  interfaceName,
  aggregateId,
  editDisabled,
  updateFieldData,
}: AggregateIdColumnProps) {
  return (
    <Input
      name={`aggregate_id|${interfaceName}`}
      defaultValue={aggregateId}
      disabled={editDisabled}
      onChange={updateFieldData}
    />
  );
}

// --- BPDU filter column ---

interface BpduFilterColumnProps {
  readonly interfaceName: string;
  readonly bpduFilter: boolean;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}

export function BpduFilterColumn({
  interfaceName,
  bpduFilter,
  editDisabled,
  updateFieldData,
}: BpduFilterColumnProps) {
  return (
    <Popup
      header="Enable spanning-tree BPDU filter on this interface"
      wide
      hoverable
      trigger={
        <Checkbox
          name={`bpdu_filter|${interfaceName}`}
          defaultChecked={bpduFilter}
          onChange={updateFieldData}
          disabled={editDisabled}
        />
      }
    />
  );
}
