interface VerifyDiffInfoProps {
  readonly deviceNames: string[];
  readonly dryRunChangeScore: string | number;
}

export function VerifyDiffInfo({
  deviceNames,
  dryRunChangeScore,
}: VerifyDiffInfoProps) {
  return (
    <>
      <p>Total devices affected: {deviceNames.length}</p>
      <p>Total change score: {dryRunChangeScore}</p>
    </>
  );
}
