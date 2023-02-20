import React from "react";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { Input, Dropdown, Icon, Table, Loader, Modal, Button } from "semantic-ui-react";

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
    interfaceDataUpdated: {},
    deviceData: [],
    editDisabled: false,
    vlanOptions: []
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
    getData(url, credentials).then(data =>
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
        this.setState({
          deviceData: data['data']['devices'][0],
          editDisabled: !data['data']['devices'][0]['synchronized']
        });
      }
    ).catch(error => {
      console.log(error);
    });
    url = process.env.API_URL + "/api/v1.0/settings?hostname=" + this.hostname;
    getData(url, credentials).then(data =>
      {
        this.setState({
          deviceSettings: data['data']['settings'],
          vlanOptions: Object.entries(data['data']['settings']['vxlans']).map(([vxlan_name, vxlan_data], index) => {
            return {'value': vxlan_data.vlan_name, 'text': vxlan_data.vlan_name, 'description': vxlan_data.vlan_id};
          })
        });
//        console.log(this.vlanOptions);
      }
    ).catch(error => {
      console.log(error);
    });
  }

  sendInterfaceData() {
    // what config keys go in to level, and what goes under ["data"]
    let topLevelKeyNames = ["configtype"];
    // build object in the format API expects interfaces{} -> name{} -> configtype,data{}
    let sendData = {"interfaces": {}};
    Object.entries(this.state.interfaceDataUpdated).map(([interfaceName, formData]) => {
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
  }
  
  saveChanges() {
    // save old state
    this.sendInterfaceData();
    // getData to refresh default values
    // allow or don't allow changes to unsynced devices? will become unsync after send
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
            console.log("number matched to: "+untagged_vlan);
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
          options={this.state.vlanOptions}
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

  render() {
    let interfaceTable = this.renderTableRows(this.state.interfaceData, this.state.vlanOptions);
    let syncStateIcon = this.state.deviceData.synchronized === true ? <Icon name="check" color="green" /> : <Icon name="delete" color="red" />;

    return (
      <section>
        <p>Hostname: {this.hostname}, sync state: {syncStateIcon}</p>
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
                      <Modal.Description><pre>{JSON.stringify(this.state.interfaceDataUpdated, null, 2)}</pre></Modal.Description>
                    </Modal.Content>
                    <Modal.Actions>
                      <Button key="cancel" color='black' onClick={() => this.setState({save_modal_open: false})}>
                        Cancel
                      </Button>
                      <Button key="submit" onClick={this.sendInterfaceData.bind(this)} icon labelPosition='right' positive>
                        Save and commit now
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
