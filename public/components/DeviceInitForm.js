
import React from "react";
import PropTypes from 'prop-types'
import { Button, Select, Input, Icon } from 'semantic-ui-react'
import checkResponseStatus from "../utils/checkResponseStatus";

class DeviceInitForm extends React.Component {
  state = {
      hostname: "",
      submitDisabled: false,
      submitIcon: "play",
      submitText: "Initialize"
  };

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
    this.submitInitJob(this.props.deviceId, this.state.hostname, "ACCESS");
  }

  submitInitJob(device_id, hostname, device_type) {
    console.log("Starting device init");
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_init/" + device_id;
    let job_id = null;
    let dataToSend = {
      hostname: hostname,
      device_type: device_type
    };

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
      console.log("device_init response data", data);
      if (data.job_id !== undefined && typeof data.job_id === "number") {
        this.props.jobIdCallback(this.props.deviceId, data.job_id);
      } else {
        console.log("error when submitting device_init job", data.job_id);
      }
    });
    
  }

  render() {
    return (
      <form onSubmit={this.submitInit.bind(this)}>
        <Input placeholder="hostname"
          onChange={this.updateHostname.bind(this)}
        />
        <Select placeholder="Device type" options={[{'key': 'ACCESS', 'value': 'ACCESS', 'text': 'Access'}]} />
        <Button disabled={this.state.submitDisabled} icon labelPosition='right'>
          {this.state.submitText}
          <Icon name={this.state.submitIcon} />
        </Button>
      </form>
    );
  }
}

DeviceInitForm.propTypes = {
  deviceId: PropTypes.number,
  jobIdCallback: PropTypes.func
}

export default DeviceInitForm;