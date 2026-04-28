import { type ComponentType } from "react";

interface VerifyDiffResultProps {
  readonly deviceNames: string[];
  readonly deviceData: unknown[];
}

declare const VerifyDiffResult: ComponentType<VerifyDiffResultProps>;
export default VerifyDiffResult;
