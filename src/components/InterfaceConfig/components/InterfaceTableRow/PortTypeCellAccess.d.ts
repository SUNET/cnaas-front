import { type SyntheticEvent } from "react";

export function PortTypeCellAccess(props: {
  item: Record<string, unknown>;
  currentConfigtype: string | null;
  fields: Record<string, unknown>;
  editDisabled: boolean;
  updateFieldData: (e: SyntheticEvent, data: Record<string, unknown>) => void;
}): JSX.Element;
