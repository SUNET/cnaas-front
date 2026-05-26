import { type ReactNode, type SyntheticEvent } from "react";

export function CommitModalAccess(props: {
  accordionActiveIndex: number;
  accordionClick: (e: SyntheticEvent, titleProps: { index: number }) => void;
  autoPushJobsHTML: ReactNode[];
  errorMessage: string | null;
  interfaceDataUpdatedJSON: Record<string, unknown>;
}): JSX.Element;

export function CommitModalDist(props: {
  hostname: string | null;
  ifDataYaml: Record<string, unknown>;
}): JSX.Element;
