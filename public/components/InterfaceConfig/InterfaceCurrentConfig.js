import React from "react";
import PropTypes from "prop-types";
import { Icon } from "semantic-ui-react";
import getData from "../../utils/getData";

class InterfaceCurrentConfig extends React.Component {
  state = {
    config: null,
  };

  componentDidMount() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.props.hostname}/running_config?interface=${this.props.interface}`;
    if (this.state.config === null) {
      getData(url, credentials).then((data) => {
        this.setState({ config: data.data.config });
      });
    }
  }

  render() {
    if (this.state.config === null) {
      return <Icon name="spinner" loading />;
    }
    return (
      <textarea
        key="config"
        defaultValue={this.state.config}
        rows={3}
        cols={50}
        readOnly
      />
    );
  }
}

InterfaceCurrentConfig.propTypes = {
  hostname: PropTypes.string,
  interface: PropTypes.string,
};

export default InterfaceCurrentConfig;
