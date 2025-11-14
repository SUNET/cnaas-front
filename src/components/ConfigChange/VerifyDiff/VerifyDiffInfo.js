function VerifyDiffInfo({ deviceNames, dryRunChangeScore }) {
  return (
    <>
      <p>Total devices affected: {deviceNames.length}</p>
      <p>Total change score: {dryRunChangeScore}</p>
    </>
  );
}

export default VerifyDiffInfo;
