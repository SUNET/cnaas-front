type VerifyDiffInfoProps = {
  readonly deviceNames: string[];
  readonly dryRunChangeScore: number | null;
};

export function VerifyDiffInfo({
  deviceNames,
  dryRunChangeScore,
}: VerifyDiffInfoProps) {
  return (
    <>
      <p>Total devices affected: {deviceNames.length}</p>
      <p>Total change score: {dryRunChangeScore ?? ""}</p>
    </>
  );
}
