import React from "react";

class VerifyDiffInfo extends React.Component {
  render() {
    // console.log("this is props in configchange progress data", this.props);
    const totalDevicesAffected = this.props.deviceNames.length;
    const { dryRunChangeScore } = this.props;

    return (
      <>
        <p>Total devices affected: {totalDevicesAffected}</p>
        <p>Total change score: {dryRunChangeScore}</p>
      </>
    );
  }
}

export default VerifyDiffInfo;
