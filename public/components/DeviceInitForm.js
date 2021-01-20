
import React from "react";
import PropTypes from 'prop-types'
import { Button, Select, Input, Icon, Modal } from 'semantic-ui-react'
import checkResponseStatus from "../utils/checkResponseStatus";
import checkJsonResponse from "../utils/checkJsonResponse";

class DeviceInitForm extends React.Component {
  state = {
      hostname: "",
      submitDisabled: false,
      submitIcon: "window restore outline",
      submitText: "Initialize...",
      device_type: null,
      mlag_init: false,
      mlag_peer_hostname: null,
      mlag_peer_id: null,
      mlag_peer_candidates: [],
      modal_open: false,
      initcheck_output: null
  };

  updateHostname(e) {
    const val = e.target.value;
    this.setState({
      hostname: val
    });
  }

  updatePeerHostname(e) {
    const val = e.target.value;
    this.setState({
      mlag_peer_hostname: val
    });
  }

  onChangeDevicetype = (e, data) => {
    if (data.value == "ACCESSMLAG") {
      this.getMlagPeerCandidates(this.props.deviceId);
      this.setState({device_type: "ACCESS", mlag_init: true});
    } else {
      this.setState({device_type: data.value, mlag_init: false});
    }
  }

  onChangePeerdevice = (e, data) => {
    this.setState({mlag_peer_id: data.value});
  }

  submitInit() {
    this.setState({modal_open: false});
    console.log("init submitted: "+this.state.hostname+" id: "+this.props.deviceId);
    this.setState({
      submitDisabled: true,
      submitIcon: "cog",
      submitText: "Initializing...",
    });
    if (this.state.mlag_init) {
      //this.submitInitJob(this.props.deviceId, this.state.hostname, this.state.device_type, this.state.mlag_peer_hostname, this.state.mlag_peer_id);
    } else {
      //this.submitInitJob(this.props.deviceId, this.state.hostname, this.state.device_type);
    }
  }

  startInitCheck() {
    if (this.state.mlag_init) {
      this.initCheck(this.props.deviceId, this.state.hostname, this.state.device_type, this.state.mlag_peer_hostname, this.state.mlag_peer_id);
    } else {
      this.initCheck(this.props.deviceId, this.state.hostname, this.state.device_type);
    }
  }

  initCheck(device_id, hostname, device_type, mlag_peer_hostname = null, mlag_peer_id = null) {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_initcheck/" + device_id;
    let job_id = null;
    let dataToSend = {
      hostname: hostname,
      device_type: device_type
    };
    if (mlag_peer_hostname !== null && mlag_peer_id !== null) {
      dataToSend["mlag_peer_hostname"] = mlag_peer_hostname;
      dataToSend["mlag_peer_id"] = mlag_peer_id;
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => checkJsonResponse(response))
    .then(data => {
      console.log("device_initcheck response data", data);
      this.setState({initcheck_output: JSON.stringify(data.data, null, 2)});
    })
    .catch((error) => {
      this.setState({
        initcheck_output: error.message
      })
    });
  }

  submitInitJob(device_id, hostname, device_type, mlag_peer_hostname = null, mlag_peer_id = null) {
    console.log("Starting device init");
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_init/" + device_id;
    let job_id = null;
    let dataToSend = {
      hostname: hostname,
      device_type: device_type
    };
    if (mlag_peer_hostname !== null && mlag_peer_id !== null) {
      dataToSend["mlag_peer_hostname"] = mlag_peer_hostname;
      dataToSend["mlag_peer_id"] = mlag_peer_id;
    }

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

  getMlagPeerCandidates(device_id) {
    const credentials = localStorage.getItem("token");
    fetch(
      process.env.API_URL +
      "/api/v1.0/devices?filter[state]=DISCOVERED" +
      "&per_page=100",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials}`
        }
      }
    )
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
      console.log("this should be mlag peer candidate data", data);
      {
        this.setState(
          {
            mlag_peer_candidates: data.data.devices.filter(value => value.id != this.props.deviceId).map((value) => {
              return {'key': value.id, 'value': value.id, 'text': "ID " + value.id + " / MAC " + value.ztp_mac + " / SN " + value.serial}
            })
          },
          () => {
            console.log("mlag peer candidates", this.state.mlag_peer_candidates);
          }
        );
      }
    })
//    .catch((error) => {
//      this.setState({
//        mlag_peer_candidates: [],
//        error: error
//      })
//    });
  }

  render() {
    let mlag_inputs = null;
    if (this.state.mlag_init) {
      mlag_inputs = [
        <Select key="mlag_peer_id" placeholder="peer device" onChange={this.onChangePeerdevice}
          options={this.state.mlag_peer_candidates}
        />,
        <Input key="mlag_peer_hostname" placeholder="peer hostname"
          onChange={this.updatePeerHostname.bind(this)}
        />
      ];
    }
    let initcheck_output = <Icon name="spinner" loading={true} />;
    if (this.state.initcheck_output !== null) {
      initcheck_output = this.state.initcheck_output;
    }
    return (
      <div>
        <Input key="hostname" placeholder="hostname"
          onChange={this.updateHostname.bind(this)}
        />
        <Select key="device_type" placeholder="Device type" onChange={this.onChangeDevicetype} options={[
          {'key': 'ACCESS', 'value': 'ACCESS', 'text': 'Access'},
          {'key': 'ACCESSMLAG', 'value': 'ACCESSMLAG', 'text': 'Access MLAG pair'}
          ]} />
        {mlag_inputs}
        <Modal
          onClose={() => this.setState({modal_open: false, initcheck_output: null})}
          onOpen={() => this.setState({modal_open: true})}
          open={this.state.modal_open}
          trigger={
          <Button disabled={this.state.submitDisabled} icon labelPosition='right' onClick={() => this.startInitCheck()}>
            {this.state.submitText}
            <Icon name={this.state.submitIcon} />
          </Button>
          }
        >
          <Modal.Header>Init compatability check</Modal.Header>
          <Modal.Content>
            <Modal.Description><pre>{initcheck_output}</pre></Modal.Description>
          </Modal.Content>
          <Modal.Actions>
            <Button key="cancel" color='black' onClick={() => this.setState({modal_open: false, initcheck_output: null})}>
              Cancel
            </Button>
            <Button key="submit" onClick={() => this.submitInit()} icon labelPosition='right'>
              Start initialization
            </Button>
          </Modal.Actions>
        </Modal>
      </div>
    );
  }
}

DeviceInitForm.propTypes = {
  deviceId: PropTypes.number,
  jobIdCallback: PropTypes.func
}

export default DeviceInitForm;