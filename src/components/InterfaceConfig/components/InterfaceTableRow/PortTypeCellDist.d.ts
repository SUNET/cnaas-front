import { type SyntheticEvent } from "react";

export function PortTypeCellDist(props: {
  item: Record<string, unknown>;
  currentIfClass: string | null;
  portTemplate: string | null;
  editDisabled: boolean;
  portTemplateOptions: Array<{ text: string; value: string }>;
  updateFieldData: (e: SyntheticEvent, data: Record<string, unknown>) => void;
  addPortTemplateOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
}): JSX.Element;
