import React from "react";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { Input, Dropdown, Icon, Table, Tab } from "semantic-ui-react";

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
    interfaceDataUpdated: {},
    deviceData: [],
    editDisabled: false
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
  }

  updateDescription(e) {
    const interfaceName = e.target.name.split('_', 2)[1];
    const val = e.target.value;
    const defaultValue = e.target.defaultValue;
    let newData = this.state.interfaceDataUpdated;
    if (val !== defaultValue) {
      console.log(interfaceName+" "+val);
      if (interfaceName in newData) {
        let newInterfaceData = newData[interfaceName];
        newInterfaceData["description"] = val;
        newData[interfaceName] = newInterfaceData;
      } else {
        let newData = this.state.interfaceDataUpdated;
        newData[interfaceName] = {"description": val};
      }
    } else {
      delete newData[interfaceName].description;
      if (Object.keys(newData[interfaceName]).length == 0) {
        delete newData[interfaceName];
      }
    }
    this.setState({
      interfaceDataUpdated: newData
    });
  }

  renderTableRows(interfaceData) {
    return interfaceData.map((item, index) => {
      let ifData = item.data;
      let description = "";
      let editDisabled = !(this.configTypesEnabled.includes(item.configtype));
      let updated = (item.name in this.state.interfaceDataUpdated);
      console.log(ifData);
      if (ifData !== null) {
        if ('description' in ifData) {
          description = ifData.description;
        }
      }

      return [
        <Table.Row key={"tr_"+index} disabled={editDisabled} warning={updated}>
          <Table.Cell>{item.name}</Table.Cell>
          <Table.Cell>
            <Input
              key={"description_"+item.name}
              name={"description_"+item.name}
              defaultValue={description}
              onChange={this.updateDescription.bind(this)}
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
          <Table.Cell>{JSON.stringify(item.data)}</Table.Cell>
        </Table.Row>
      ];
    });
  }

  render() {
    let interfaceTable = this.renderTableRows(this.state.interfaceData);
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
