import React from "react";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { putData, postData } from "../../utils/sendData";
import { Input, Dropdown, Icon, Table, Loader, Modal, Button, Accordion } from "semantic-ui-react";
const io = require("socket.io-client");
var socket = null;

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
    interfaceDataUpdated: {},
    deviceData: {},
    editDisabled: false,
    vlanOptions: [],
    autoPushJobs: [],
    thirdPartyUpdated: false,
    accordionActiveIndex: 0,
    errorMessage: null,
    working: false,
    initialSyncState: null,
    initialConfHash: null
  }
  hostname = null;
  configTypeOptions = [
    {'value': "ACCESS_AUTO", 'text': "Auto/dot1x"},
    {'value': "ACCESS_UNTAGGED", 'text': "Untagged/access"},
    {'value': "ACCESS_TAGGED", 'text': "Tagged/trunk"},
    {'value': "ACCESS_DOWNLINK", 'text': "Downlink"},
    {'value': "ACCESS_UPLINK", 'text': "Uplink", 'disabled': true},
    {'value': "MLAG_PEER", 'text': "MLAG peer interface", 'disabled': true},
  ];
  configTypesEnabled = ["ACCESS_AUTO", "ACCESS_UNTAGGED", "ACCESS_TAGGED", "ACCESS_DOWNLINK"];

  componentDidMount() {
    this.hostname = this.getDeviceName();
    if (this.hostname !== null) {
      this.getInterfaceData();
      this.getDeviceData();
    }
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, {query: {jwt: credentials}});
    socket.on('connect', function(data) {
      console.log('Websocket connected!');
      var ret = socket.emit('events', {'update': 'device'});
      var ret = socket.emit('events', {'update': 'job'});
    });
    socket.on('events', (data) => {
      // device update event
      if (data.device_id !== undefined && data.device_id == this.state.deviceData['id'] && data.action == "UPDATED") {
        console.log("DEBUG: ");
        console.log(this.state.deviceData);
        console.log(data.object);
        this.setState({deviceData: data.object});
      // job update event
      } else if (data.job_id !== undefined) {
        // if job updated state
        let newState = {};
        if (data.function_name === "refresh_repo" && this.state.thirdPartyUpdated === false) {
          newState.thirdPartyUpdated = true;
        }
        if (this.state.autoPushJobs.length == 1 && this.state.autoPushJobs[0].job_id == data.job_id) {
          // if finished && next_job id, push next_job_id to array
          if (data.next_job_id !== undefined && typeof data.next_job_id === "number") {
            newState.autoPushJobs = [data, {'job_id': data.next_job_id, "status": "RUNNING"}];
          } else if (data.status == "FINISHED" || data.status == "EXCEPTION") {
            newState.errorMessage = "Live run job not scheduled, there was an error or change score was too high to continue with autopush. Check logs or do dry run job manually.";
            newState.working = false;
            newState.autoPushJobs = [data];
            newState.accordionActiveIndex = 2;
          }
        } else if (this.state.autoPushJobs.length == 2 && this.state.autoPushJobs[1].job_id == data.job_id) {
          newState.autoPushJobs = [this.state.autoPushJobs[0], data];
          if (data.status == "FINISHED" || data.status == "EXCEPTION") {
            newState.working = false;
            newState.interfaceDataUpdated = {};
            this.setState({
              initialSyncState: null,
              initialConfHash: null
            }, () => {
              this.getInterfaceData();
              this.getDeviceData();
            });
          }
        }
        if (Object.keys(newState).length >= 1) {
          this.setState(newState);
        }
      }
    });
  }

  getDeviceName() {
    let queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return queryParams.hostname;
    } else {
      return null;
    }
  }

  getInterfaceData() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device/" + this.hostname + "/interfaces";
    return getData(url, credentials).then(data =>
      {
        this.setState({
          interfaceData: data['data']['interfaces']
        });
      }
    ).catch(error => {
      console.log(error);
    });
  }

  getDeviceData() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device/" + this.hostname;
    getData(url, credentials).then(data =>
      {
        let newState = {
          deviceData: data['data']['devices'][0],
          editDisabled: !data['data']['devices'][0]['synchronized']
        };
        if (this.state.initialSyncState == null) {
          newState.initialSyncState = data['data']['devices'][0]['synchronized'];
          newState.initialConfHash = data['data']['devices'][0]['confhash'];
        }
        this.setState(newState);
      }
    ).catch(error => {
      console.log(error);
    });
    url = process.env.API_URL + "/api/v1.0/settings?hostname=" + this.hostname;
    getData(url, credentials).then(data =>
      {
        const vlanOptions = Object.entries(data['data']['settings']['vxlans']).map(([vxlan_name, vxlan_data], index) => {
            return {'value': vxlan_data.vlan_name, 'text': vxlan_data.vlan_name, 'description': vxlan_data.vlan_id};
        });
        let untaggedVlanOptions = [...vlanOptions];
        untaggedVlanOptions.push({'value': null, 'text': "None", 'description': "NA"});

        this.setState({
          deviceSettings: data['data']['settings'],
          vlanOptions: vlanOptions,
          untaggedVlanOptions: untaggedVlanOptions
        });
//        console.log(this.vlanOptions);
      }
    ).catch(error => {
      console.log(error);
    });
  }
  
  prepareSendJson(interfaceData) {
    // what config keys go in to level, and what goes under ["data"]
    let topLevelKeyNames = ["configtype"];
    // build object in the format API expects interfaces{} -> name{} -> configtype,data{}
    let sendData = {"interfaces": {}};
    Object.entries(interfaceData).map(([interfaceName, formData]) => {
      let topLevelKeys = {};
      let dataLevelKeys = {};
      Object.entries(formData).map(([formKey, formValue]) => {
        if (topLevelKeyNames.includes(formKey)) {
          topLevelKeys[formKey] = formValue;
        } else {
          dataLevelKeys[formKey] = formValue;
        }
      });
      if (Object.keys(dataLevelKeys).length >= 0) {
        topLevelKeys["data"] = dataLevelKeys;
      }
      sendData["interfaces"][interfaceName] = topLevelKeys;
    });
    return sendData;
  }

  sendInterfaceData() {
    const credentials = localStorage.getItem("token");
    const url = process.env.API_URL + "/api/v1.0/device/" + this.hostname + "/interfaces";

    let sendData = this.prepareSendJson(this.state.interfaceDataUpdated);

    return putData(url, credentials, sendData).then(data => {
      console.log("put interface return data: ");
      console.log(data);

      if ( data.status === "success" ) {
        return true;
      } else {
        this.setState({errorMessage: data.message});
        return false;
      }
    }).catch(error => {
      this.setState({errorMessage: error.message});
      return false;
    });
  }

  startSynctoAutopush() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_syncto";

    let sendData = {
      "dry_run": true,
      "comment": "interface update via WebUI",
      "hostname": this.hostname,
      "auto_push": true
    };

    postData(url, credentials, sendData).then(data => {
      this.setState({
        autoPushJobs: [{"job_id": data.job_id, "status": "RUNNING"}],
        working: true
      });
    });
  }
  
  saveAndCommitChanges() {
    // save old state
    this.sendInterfaceData().then(saveStatus => {
      if (saveStatus === true) {
        this.startSynctoAutopush();
        this.setState({accordionActiveIndex: 3});
      } else {
        this.setState({accordionActiveIndex: 2});
      }
    });
  }

  saveChanges() {
    this.sendInterfaceData().then(saveStatus => {
      if (saveStatus === true) {
        this.props.history.push('/config-change?hostname='+this.hostname);
      } else {
        this.setState({accordionActiveIndex: 2});
      }
    })

  }

  updateFieldData = (e, data) => {
    const nameSplit = data.name.split('|', 2);
    const interfaceName = nameSplit[1];
    const json_key = nameSplit[0];
    const val = data.value;
    const defaultValue = data.defaultValue;
    let newData = this.state.interfaceDataUpdated;
    if (JSON.stringify(val) !== JSON.stringify(defaultValue)) {
      if (interfaceName in newData) {
        let newInterfaceData = newData[interfaceName];
        newInterfaceData[json_key] = val;
        newData[interfaceName] = newInterfaceData;
      } else {
        let newData = this.state.interfaceDataUpdated;
        newData[interfaceName] = {[json_key]: val};
      }
    } else {
      delete newData[interfaceName][json_key];
      if (Object.keys(newData[interfaceName]).length == 0) {
        delete newData[interfaceName];
      }
    }
    this.setState({
      interfaceDataUpdated: newData
    });
  }

  renderTableRows(interfaceData, vlanOptions) {
    return interfaceData.map((item, index) => {
      let ifData = item.data;
      let description = "";
      let editDisabled = !(this.configTypesEnabled.includes(item.configtype));
      let updated = (item.name in this.state.interfaceDataUpdated);
      let untagged_vlan = null;
      let tagged_vlan_list = null;
//      console.log(ifData);
      if (ifData !== null) {
        if ('description' in ifData) {
          description = ifData.description;
        } else if ('neighbor' in ifData) {
          description = "Uplink to " + ifData.neighbor;
        } else if ('neighbor_id' in ifData) {
          description = "MLAG peer to device_id " + ifData.neighbor_id;
        }
        if ('untagged_vlan' in ifData) {
          if (typeof(ifData['untagged_vlan']) === "number") {
            let untagged_vlan_mapped = vlanOptions.filter(item => item.description == ifData['untagged_vlan']);
            if (Array.isArray(untagged_vlan_mapped) && untagged_vlan_mapped.length == 1) {
              untagged_vlan = untagged_vlan_mapped[0].value;
            } else {
              untagged_vlan = null;
            }
//            console.log("number matched to: "+untagged_vlan);
          } else {
            untagged_vlan = ifData['untagged_vlan']
          }
        }
        if ('tagged_vlan_list' in ifData) {
          tagged_vlan_list = ifData['tagged_vlan_list'];
        }
      }

      let currentConfigtype = item.configtype;
      if (item.name in this.state.interfaceDataUpdated && "configtype" in this.state.interfaceDataUpdated[item.name]) {
        currentConfigtype = this.state.interfaceDataUpdated[item.name].configtype;
      }

      let dataCell = "";
      if (vlanOptions.length == 0 ) {
        dataCell = <Loader inline active />
      } else if (currentConfigtype === "ACCESS_TAGGED") {
        dataCell = <Dropdown
          key={"tagged_vlan_list|"+item.name}
          name={"tagged_vlan_list|"+item.name}
          fluid multiple selection
          options={this.state.vlanOptions}
          defaultValue={tagged_vlan_list}
          onChange={this.updateFieldData}
        />
      } else if (currentConfigtype === "ACCESS_UNTAGGED") {
        dataCell = <Dropdown
          key={"untagged_vlan|"+item.name}
          name={"untagged_vlan|"+item.name}
          fluid selection
          options={this.state.untaggedVlanOptions}
          defaultValue={untagged_vlan}
          onChange={this.updateFieldData}
        />
      } else {
        dataCell = JSON.stringify(item.data);
      }

      return [
        <Table.Row key={"tr_"+index} disabled={editDisabled} warning={updated}>
          <Table.Cell>{item.name}</Table.Cell>
          <Table.Cell>
            <Input
              key={"description|"+item.name}
              name={"description|"+item.name}
              defaultValue={description}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
          </Table.Cell>
          <Table.Cell>
            <Dropdown
              key={"configtype|"+item.name}
              name={"configtype|"+item.name}
              selection
              options={this.configTypeOptions}
              defaultValue={item.configtype}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
          </Table.Cell>
          <Table.Cell>
            {dataCell}
          </Table.Cell>
        </Table.Row>
      ];
    });
  }

  accordionClick = (e, titleProps) => {
    const index = titleProps.index;
    const accordionActiveIndex = this.state.accordionActiveIndex;
    const newIndex = accordionActiveIndex === index ? -1 : index;

    this.setState({ accordionActiveIndex: newIndex });
  }

  render() {
    let interfaceTable = this.renderTableRows(this.state.interfaceData, this.state.vlanOptions);
    let syncStateIcon = this.state.deviceData.synchronized === true ? <Icon name="check" color="green" /> : <Icon name="delete" color="red" />;
    let accordionActiveIndex = this.state.accordionActiveIndex;
    let commitAutopushDisabled = (
      this.state.working || 
      !this.state.initialSyncState ||
      (this.state.initialConfHash != this.state.deviceData.confhash)
    );
    let stateWarning = null;
    if (!this.state.initialSyncState || (this.state.initialConfHash != this.state.deviceData.confhash)) {
      stateWarning = <p><Icon name="warning sign" color="orange" size="large" />Device is not synchronized, use dry_run and verify diff to apply changes.</p>;
    }

    return (
      <section>
        <p>Hostname: {this.hostname}, sync state: {syncStateIcon}</p>
        {stateWarning}
        <div id="device_list">
          <div id="data">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={2}>Name</Table.HeaderCell><Table.HeaderCell width={4}>Description</Table.HeaderCell><Table.HeaderCell width={3}>Configtype</Table.HeaderCell><Table.HeaderCell width={3}>Data</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {interfaceTable}
            </Table.Body>
            <Table.Footer fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan={4}>
                  <Modal
                    onClose={() => this.setState({save_modal_open: false})}
                    onOpen={() => this.setState({save_modal_open: true})}
                    open={this.state.save_modal_open}
                    trigger={
                    <Button icon labelPosition='right'>
                      Save & commit...
                      <Icon name="window restore outline" />
                    </Button>
                    }
                  >
                    <Modal.Header>Save & commit</Modal.Header>
                    <Modal.Content>
                      <Modal.Description>
                        <Accordion>
                          <Accordion.Title
                            active={accordionActiveIndex === 1}
                            index={1}
                            onClick={this.accordionClick}
                          >
                            <Icon name='dropdown' />
                            POST JSON: 
                          </Accordion.Title>
                          <Accordion.Content active={accordionActiveIndex === 1}>
                            <pre>{JSON.stringify(this.prepareSendJson(this.state.interfaceDataUpdated), null, 2)}</pre>
                          </Accordion.Content>
                          <Accordion.Title
                            active={accordionActiveIndex === 2}
                            index={2}
                            onClick={this.accordionClick}
                          >
                            <Icon name='dropdown' />
                            POST error: 
                          </Accordion.Title>
                          <Accordion.Content active={accordionActiveIndex === 2}>
                            <p>{JSON.stringify(this.state.errorMessage)}</p>
                          </Accordion.Content>
                          <Accordion.Title
                            active={accordionActiveIndex === 3}
                            index={3}
                            onClick={this.accordionClick}
                          >
                            <Icon name='dropdown' />
                            Job output: 
                          </Accordion.Title>
                          <Accordion.Content active={accordionActiveIndex === 3}>
                            <pre>{JSON.stringify(this.state.autoPushJobs)}</pre>
                          </Accordion.Content>
                        </Accordion>
                      </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions>
                      <Button key="close" color='black' onClick={() => this.setState({save_modal_open: false, autoPushJobs: [], errorMessage: null, accordionActiveIndex: 0})}>
                        Close
                      </Button>
                      <Button key="submit" onClick={this.saveAndCommitChanges.bind(this)} disabled={commitAutopushDisabled} color="yellow">
                        Save and commit now
                      </Button>
                      <Button key="dryrun" onClick={this.saveChanges.bind(this)} disabled={this.state.working} positive>
                        Save and dry run...
                      </Button>
                    </Modal.Actions>
                  </Modal>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Footer>
          </Table>
          </div>
        </div>
      </section>
    )
  }
}

export default InterfaceConfig;
