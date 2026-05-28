import { type SyntheticEvent } from "react";
import { Checkbox, Dropdown, Icon, Input, Popup } from "semantic-ui-react";

// --- Tags column ---

type TagsColumnProps = {
  readonly interfaceName: string;
  readonly tags: string[];
  readonly editDisabled: boolean;
  readonly tagOptions: string[];
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addTagOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function TagsColumn({
  interfaceName,
  tags,
  editDisabled,
  tagOptions,
  updateFieldData,
  addTagOption,
}: TagsColumnProps) {
  const options = tagOptions.map((tag) => ({ text: tag, value: tag }));
  return (
    <Dropdown
      name={`tags|${interfaceName}`}
      fluid
      multiple
      selection
      search
      allowAdditions
      options={options}
      defaultValue={tags}
      onAddItem={addTagOption}
      onChange={updateFieldData}
      disabled={editDisabled}
    />
  );
}

// --- JSON column ---

type JsonColumnProps = {
  readonly data: Record<string, unknown> | undefined;
};

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

type AggregateIdColumnProps = {
  readonly interfaceName: string;
  readonly aggregateId: unknown;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

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

type BpduFilterColumnProps = {
  readonly interfaceName: string;
  readonly bpduFilter: boolean;
  readonly editDisabled: boolean;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

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
