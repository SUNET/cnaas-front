import React from "react";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { Input, Dropdown, Icon, Table, Loader, Dimmer } from "semantic-ui-react";

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

  updateStringData(json_key, e) {
    const interfaceName = e.target.name.split('_', 2)[1];
    const val = e.target.value;
    const defaultValue = e.target.defaultValue;
    let newData = this.state.interfaceDataUpdated;
    if (val !== defaultValue) {
//      console.log(interfaceName+" "+val);
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
      }

      let currentConfigtype = item.configtype;
      if (item.name in this.state.interfaceDataUpdated && "configtype" in this.state.interfaceDataUpdated[item.name]) {
        currentConfigtype = this.state.interfaceDataUpdated[item.name].configtype;
      }

      let dataCell = "";
      if (vlanOptions.length == 0 ) {
        dataCell = <Loader inline active />
      } else if (currentConfigtype === "ACCESS_TAGGED") {
        dataCell = <Dropdown fluid multiple selection options={this.state.vlanOptions} defaultValue={ifData.tagged_vlan_list} />
      } else if (currentConfigtype === "ACCESS_UNTAGGED") {
        dataCell = <Dropdown fluid selection options={this.state.vlanOptions} defaultValue={untagged_vlan} />
      } else {
        dataCell = JSON.stringify(item.data);
      }

      return [
        <Table.Row key={"tr_"+index} disabled={editDisabled} warning={updated}>
          <Table.Cell>{item.name}</Table.Cell>
          <Table.Cell>
            <Input
              key={"description_"+item.name}
              name={"description_"+item.name}
              defaultValue={description}
              disabled={editDisabled}
              onChange={this.updateStringData.bind(this, "description")}
            />
          </Table.Cell>
          <Table.Cell>
            <Dropdown
              key={"configtype_"+item.name}
              options={this.configTypeOptions}
              defaultValue={item.configtype}
              disabled={editDisabled}
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
                <Table.HeaderCell>Name</Table.HeaderCell><Table.HeaderCell>Description</Table.HeaderCell><Table.HeaderCell>Configtype</Table.HeaderCell><Table.HeaderCell>Data</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {interfaceTable}
            </Table.Body>
          </Table>
          </div>
        </div>
      </section>
    )
  }
}

export default InterfaceConfig;
