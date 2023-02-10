import React from "react";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { Input, Dropdown, Icon, Popup, Button, Select, Checkbox } from "semantic-ui-react";

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
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
    const val = e.target.value;
  }

  renderTableRows(interfaceData) {
    return interfaceData.map((item, index) => {
      let ifData = item.data;
      let description = "";
      let editDisabled = !(this.configTypesEnabled.includes(item.configtype));
      console.log(ifData);
      if (ifData !== null) {
        if ('description' in ifData) {
          description = ifData.description;
        }
      }

      return [
        <tr>
          <td>{item.name}</td>
          <td>
            <Input key={"description_"+item.name} defaultValue={description}
              onChange={this.updateDescription.bind(this)}
            />
          </td>
          <td>
            <Dropdown
              options={this.configTypeOptions}
              defaultValue={item.configtype}
              disabled={editDisabled}
            />
          </td>
          <td>{JSON.stringify(item.data)}</td>
          </tr>
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
          <table>
            <thead>
              <tr>
                <td>Name</td><td>Description</td><td>Configtype</td><td>Data</td>
              </tr>
            </thead>
            <tbody>
              {interfaceTable}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    )
  }
}

export default InterfaceConfig;
