import PropTypes from "prop-types";

VerifyDiffInfo.propTypes = {
  deviceNames: PropTypes.array,
  dryRunChangeScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function VerifyDiffInfo({ deviceNames, dryRunChangeScore }) {
  return (
    <>
      <p>Total devices affected: {deviceNames.length}</p>
      <p>Total change score: {dryRunChangeScore}</p>
    </>
  );
}

export default VerifyDiffInfo;
