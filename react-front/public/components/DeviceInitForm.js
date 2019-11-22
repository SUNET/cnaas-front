
import React from "react";
import PropTypes from 'prop-types'
import { Button, Select, Input, Icon } from 'semantic-ui-react'

class DeviceInitForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hostname: "",
      submitDisabled: false,
      submitIcon: "play",
      submitText: "Initialize"
    };
  }

  updateHostname(e) {
    const val = e.target.value;
    this.setState({
      hostname: val
    });
  }

  submitInit(e) {
    e.preventDefault();
    console.log("init submitted: "+this.state.hostname+" id: "+this.props.deviceId);
    this.setState({
      submitDisabled: true,
      submitIcon: "cog",
      submitText: "Initializing...",
    })
  }

  render() {
    return (
      <form onSubmit={this.submitInit.bind(this)}>
        <Input placeholder="hostname"
          onChange={this.updateHostname.bind(this)}
        />
        <Select placeholder="Device type" options={[{'key': 'ACCESS', 'value': 'ACCESS', 'text': 'Access'}]} />
        <Button disabled={this.state.submitDisabled} icon labelPosition='right'>
          Initialize
          <Icon name={this.state.submitIcon} />
        </Button>
      </form>
    );
  }
}

DeviceInitForm.propTypes = {
  deviceId: PropTypes.number
}

export default DeviceInitForm;