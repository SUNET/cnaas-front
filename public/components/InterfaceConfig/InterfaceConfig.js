import _ from 'lodash'
import React from "react";
import { Link } from "react-router-dom";
import queryString from 'query-string';
import getData from "../../utils/getData";
import { putData, postData } from "../../utils/sendData";
import { Input, Dropdown, Icon, Table, Loader, Modal, Button, Accordion, Popup, Checkbox, TableCell } from "semantic-ui-react";
const io = require("socket.io-client");
var socket = null;

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
    interfaceDataUpdated: {},
    interfaceStatusData: {},
    deviceData: {},
    deviceSettings: null,
    editDisabled: false,
    vlanOptions: [],
    autoPushJobs: [],
    thirdPartyUpdated: false,
    accordionActiveIndex: 0,
    errorMessage: null,
    working: false,
    initialSyncState: null,
    initialConfHash: null,
    awaitingDeviceSynchronization: false,
    displayColumns: ["vlans"],
    tagOptions: [],
    interfaceBounceRunning: {},
    mlagPeerHostname: null,
    interfaceToggleUntagged: {}
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
  columnWidths = {
    "vlans": 4,
    "tags": 3,
    "json": 1,
    "aggregate_id": 3,
    "bpdu_filter": 1
  };

  componentDidMount() {
    this.hostname = this.getDeviceName();
    if (this.hostname !== null) {
      this.getInterfaceData();
      this.getDeviceData();
      this.getInterfaceStatusData();
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
        if (this.state.awaitingDeviceSynchronization === true && data.object['synchronized'] === true) {
          console.log("update data after job finish");
          this.setState({
            initialSyncState: null,
            initialConfHash: null,
            awaitingDeviceSynchronization: false,
            deviceData: data.object
          }, () => {
            this.getInterfaceData();
            this.getDeviceData();
            this.refreshInterfaceStatus();
          });
        } else {
          this.setState({deviceData: data.object});
        }
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
            newState.errorMessage = ["Live run job not scheduled! There was an error or the change score was too high to continue with autopush.", 
            " Check ", <Link to="/jobs" >job log</Link>, " or do a ", <Link to={"/config-change?hostname="+this.hostname}>dry run</Link>];

          
            newState.working = false;
            newState.autoPushJobs = [data];
            newState.accordionActiveIndex = 2;
          }
        } else if (this.state.autoPushJobs.length == 2 && this.state.autoPushJobs[1].job_id == data.job_id) {
          newState.autoPushJobs = [this.state.autoPushJobs[0], data];
          if (data.status == "FINISHED" || data.status == "EXCEPTION") {
            console.log("jobs finished!");
            newState.working = false;
            newState.interfaceDataUpdated = {};
            this.setState({awaitingDeviceSynchronization: true});
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
        let usedTags = [];
        data['data']['interfaces'].map((item, index) => {
          let ifData = item.data;
          if (ifData !== null && 'tags' in ifData) {
            ifData['tags'].map((tag) => {
              usedTags.push({text: tag, value: tag})
            });
          }
        });

        data['data']['interfaces'].map((item, index) => {
          let ifData = item.data;
          if (ifData !== null && 'neighbor_id' in ifData) {
            const mlagDevURL = process.env.API_URL + "/api/v1.0/device/" + ifData.neighbor_id;
            if (this.state.mlagPeerHostname == null) {
              getData(mlagDevURL, credentials).then(data => {
                this.setState({mlagPeerHostname: data['data']['devices'][0]['hostname']})
              }).catch(error => {
                console.log("MLAG peer not found: "+error);
              })
            }
          }
        });
        this.setState({
          interfaceData: data['data']['interfaces'],
          tagOptions: usedTags
        });
      }
    ).catch(error => {
      console.log(error);
    });
  }

  getInterfaceStatusData() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device/" + this.hostname + "/interface_status";
    return getData(url, credentials).then(data =>
      {
        this.setState({
          interfaceStatusData: data['data']['interface_status']
        });
      }
    ).catch(error => {
      console.log(error);
    });
  }

  refreshInterfaceStatus() {
    this.setState({interfaceStatusData: {}}, () => {
      this.getInterfaceStatusData();
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
      if (Object.keys(dataLevelKeys).length >= 1) {
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
        this.props.history.push('/config-change?hostname='+this.hostname+'&scrollTo=dry_run');
      } else {
        this.setState({accordionActiveIndex: 2});
      }
    })

  }

  addTagOption = (e, data) => {
    let value = data.value;
    this.setState((prevState) => ({
      tagOptions: [{ text: value, value }, ...prevState.tagOptions],
    }))
  }

  updateFieldData = (e, data) => {
    const nameSplit = data.name.split('|', 2);
    const interfaceName = nameSplit[1];
    const json_key = nameSplit[0];
    let val = null;
    let defaultValue = null;
    if ('defaultChecked' in data) {
      defaultValue = data.defaultChecked;
      val = data.checked;
    } else {
      defaultValue = data.defaultValue;
      val = data.value;
    }
    if (["aggregate_id"].includes(json_key)) {
      val = parseInt(val);
      if (isNaN(val)) {
        console.log(json_key+" value is not a number");
      }
    }
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
    } else if (newData[interfaceName]) {
      if (json_key in newData[interfaceName]) {
        delete newData[interfaceName][json_key];
      }
      if (Object.keys(newData[interfaceName]).length == 0) {
        delete newData[interfaceName];
      }
    }
    this.setState({
      interfaceDataUpdated: newData
    });
  }

  submitBounce(intf) {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device/" + this.hostname + "/interface_status";

    let interfaceBounceRunningNew = this.state.interfaceBounceRunning;
    interfaceBounceRunningNew[intf] = "running";
    this.setState({interfaceBounceRunning: interfaceBounceRunningNew});

    let sendData = {"bounce_interfaces": [intf]};
    putData(url, credentials, sendData).then(data => {
      interfaceBounceRunningNew = this.state.interfaceBounceRunning;
      if ( data.status === "success" ) {
        interfaceBounceRunningNew[intf] = "finished";
      } else {
        interfaceBounceRunningNew[intf] = "error: " + data.data;
      }
      this.setState({interfaceBounceRunning: interfaceBounceRunningNew});
    }).catch(error => {
      interfaceBounceRunningNew = this.state.interfaceBounceRunning;
      interfaceBounceRunningNew[intf] = "error: " + error;
      this.setState({interfaceBounceRunning: interfaceBounceRunningNew});
    });
  }

  untaggedClick = (event, data) => {
    if (data.id in this.state.interfaceToggleUntagged) {
      let newData = this.state.interfaceToggleUntagged;
      delete newData[data.id];
      this.setState({interfaceToggleUntagged: newData});
    } else {
      let newData = this.state.interfaceToggleUntagged;
      newData[data.id] = true;
      this.setState({interfaceToggleUntagged: newData});
    }
  }

  renderTableRows(interfaceData, interfaceDataUpdated, vlanOptions) {
    return interfaceData.map((item, index) => {
      let ifData = item.data;
      let ifDataUpdated = null;
      let editDisabled = !(this.configTypesEnabled.includes(item.configtype));
      let updated = false;
      let fields = {
        "description": "",
        "untagged_vlan": null,
        "tagged_vlan_list": null,
        "tags": [],
        "enabled": true,
        "aggregate_id": null,
        "bpdu_filter": false
      };
      if (item.name in interfaceDataUpdated) {
        updated = true;
        ifDataUpdated = interfaceDataUpdated[item.name];
      }
      if (ifData === null) {
        if (ifDataUpdated !== null) {
          const check_updated_fields = ['untagged_vlan', 'tagged_vlan_list', 'enabled', 'tags', 'aggregate_id', 'bpdu_filter'];
          check_updated_fields.forEach((field_name) => {
            if (field_name in ifDataUpdated) {
              fields[field_name] = ifDataUpdated[field_name];
            }
          });
        }

      } else {
        if ('description' in ifData) {
          fields['description'] = ifData.description;
        } else if ('neighbor' in ifData) {
          fields['description'] = "Uplink to " + ifData.neighbor;
        } else if ('neighbor_id' in ifData) {
          fields['description'] = "MLAG peer link";
        }

        if (ifDataUpdated !== null && 'untagged_vlan' in ifDataUpdated) {
          fields['untagged_vlan'] = ifDataUpdated['untagged_vlan'];
        } else if ('untagged_vlan' in ifData) {
          if (typeof(ifData['untagged_vlan']) === "number") {
            let untagged_vlan_mapped = vlanOptions.filter(item => item.description == ifData['untagged_vlan']);
            if (Array.isArray(untagged_vlan_mapped) && untagged_vlan_mapped.length == 1) {
              fields['untagged_vlan'] = untagged_vlan_mapped[0].value;
            } else {
              fields['untagged_vlan'] = null;
            }
          } else {
            fields['untagged_vlan'] = ifData['untagged_vlan'];
          }
        }
        if (ifDataUpdated !== null && 'tagged_vlan_list' in ifDataUpdated) {
          fields['tagged_vlan_list'] = ifDataUpdated['tagged_vlan_list'];
        } else if ('tagged_vlan_list' in ifData) {
          fields['tagged_vlan_list'] = ifData['tagged_vlan_list'].map((vlan_item) => {
            if (typeof(vlan_item) === "number") {
              let vlan_mapped = vlanOptions.filter(item => item.description == vlan_item);
              if (Array.isArray(vlan_mapped) && vlan_mapped.length == 1) {
                return vlan_mapped[0].value;
              } else {
                return vlan_item;
              }
            } else {
              return vlan_item;
            }
          })
        }
        if (ifDataUpdated !== null) {
          const check_updated_fields = ['enabled', 'tags', 'aggregate_id', 'bpdu_filter'];
          check_updated_fields.forEach((field_name) => {
            if (field_name in ifDataUpdated) {
              fields[field_name] = ifDataUpdated[field_name];
            } else if (field_name in ifData) {
              fields[field_name] = ifData[field_name];
            }
          });
        }
      }

      let currentConfigtype = item.configtype;
      if (item.name in this.state.interfaceDataUpdated && "configtype" in this.state.interfaceDataUpdated[item.name]) {
        currentConfigtype = this.state.interfaceDataUpdated[item.name].configtype;
      }
      let displayVlanTagged = currentConfigtype === "ACCESS_TAGGED";
      if (item.name in this.state.interfaceToggleUntagged) {
        displayVlanTagged = !displayVlanTagged;
      }
      // if state button

      let optionalColumns = this.state.displayColumns.map((columnName) => {
        let colData = [];
        if (columnName == "vlans") {
          if (this.state.deviceSettings === null) {
            colData = [<Loader key="loading" inline active />];
          } else if (vlanOptions.length == 0 ) {
            colData = [<p>No VLANs available</p>];
          } else if (currentConfigtype === "ACCESS_TAGGED" || currentConfigtype === "ACCESS_UNTAGGED") {
            if (displayVlanTagged) {
              colData = [
                <Dropdown
                  key={"tagged_vlan_list|"+item.name}
                  name={"tagged_vlan_list|"+item.name}
                  fluid multiple selection search={(filteredOptions, searchQuery) => {
                    const re = new RegExp(_.escapeRegExp(searchQuery), 'i');
                    return _.filter(filteredOptions, (opt) => (re.test(opt.text) || re.test(opt.description.toString())));
                  }}
                  options={this.state.vlanOptions}
                  defaultValue={fields['tagged_vlan_list']}
                  onChange={this.updateFieldData}
                />,
              ];
            } else {
              colData = [<Dropdown
                key={"untagged_vlan|"+item.name}
                name={"untagged_vlan|"+item.name}
                fluid selection search={(filteredOptions, searchQuery) => {
                  const re = new RegExp(_.escapeRegExp(searchQuery), 'i');
                  return _.filter(filteredOptions, (opt) => (re.test(opt.text) || re.test(opt.description.toString())));
                }}
                options={this.state.untaggedVlanOptions}
                defaultValue={fields['untagged_vlan']}
                onChange={this.updateFieldData}
              />];
            }
            if (currentConfigtype === "ACCESS_TAGGED") {
              colData.push(
                <Popup
                  key="untagged_button"
                  content="Change untagged VLAN"
                  trigger={<Button id={item.name} compact size="small" icon onClick={this.untaggedClick.bind(this)} active={item.name in this.state.interfaceToggleUntagged}><Icon size="small" name='underline' /></Button>}
                />
              );
            }
          }
        } else if (columnName == "tags") {
          colData = [<Dropdown
            key={"tags|"+item.name}
            name={"tags|"+item.name}
            fluid multiple selection search allowAdditions
            options={this.state.tagOptions}
            defaultValue={fields['tags']}
            onAddItem={this.addTagOption}
            onChange={this.updateFieldData}
            disabled={editDisabled}
          />];
        } else if (columnName == "json") {
          if (item.data !== null) {
            colData =
              [<Popup
                key="rawjson"
                header="Raw JSON data"
                content={JSON.stringify(item.data)}
                position="top right"
                wide
                hoverable
                trigger={<Icon color="grey" name="ellipsis horizontal" />}
              />];
          }
        } else if (columnName == "aggregate_id") {
          colData = [
            <Input
              key={"aggregate_id|"+item.name}
              name={"aggregate_id|"+item.name}
              defaultValue={fields['aggregate_id']}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
          ];
        } else if (columnName == "bpdu_filter") {
          colData = [
            <Popup
              key="bpdu_filter"
              header="Enable spanning-tree BPDU filter on this interface"
              wide
              hoverable
              trigger={
                <Checkbox
                  key={"bpdu_filter|"+item.name}
                  name={"bpdu_filter|"+item.name}
                  defaultChecked={fields['bpdu_filter']}
                  onChange={this.updateFieldData}
                  disabled={editDisabled}
                />
              }
            />
          ];
        }
        return <Table.Cell collapsing key={columnName}>{colData}</Table.Cell>;
      });

      let statusIcon = <Icon loading color="grey" name="spinner" />;
      if (item.name in this.state.interfaceStatusData) {
        let toggleEnabled = <Checkbox
          key={"enabled|"+item.name}
          name={"enabled|"+item.name}
          toggle
          label={<label>Enable interface</label>}
          defaultChecked={fields['enabled']}
          onChange={this.updateFieldData}
          disabled={editDisabled}
        />;
        let bounceDisabled = false;
        let bounceButtonIcon = <Icon name="retweet" />;
        let statusMessage = null;
        if (item.name in this.state.interfaceBounceRunning) {
          if (this.state.interfaceBounceRunning[item.name] === "running") {
            bounceDisabled = true;
          } else {
            statusMessage = <p key="message">{this.state.interfaceBounceRunning[item.name]}</p>;
          }
        }
        let bounceInterfaceButton = <Button 
          key={"bounce"}
          disabled={(editDisabled || bounceDisabled)}
          loading={(bounceDisabled)}
          icon labelPosition='right'
          onClick={() => this.submitBounce(item.name)}
          size="small"
          >Bounce interface {bounceButtonIcon}</Button>;
        if (this.state.interfaceStatusData[item.name]['is_up'] == true) {
          statusIcon = <Popup
                         header={item.name}
                         content={[
                         <p key="status">Interface is up, speed: {this.state.interfaceStatusData[item.name]['speed']} Mbit/s</p>,
                          toggleEnabled, bounceInterfaceButton, statusMessage]}
                         position="right center"
                         wide
                         hoverable
                         trigger={<Icon color="green" name="circle" />}
                       />;
        } else if (this.state.interfaceStatusData[item.name]['is_enabled'] == false) {
          statusIcon = <Popup
                         header={item.name}
                         content={[<p key="status">Interface is admin disabled</p>, toggleEnabled]}
                         position="right center"
                         wide
                         hoverable
                         trigger={<Icon color="red" name="circle" />}
                       />;
        } else {
          statusIcon = <Popup
                         header={item.name}
                         content={[<p key="status">Interface is down</p>, toggleEnabled, bounceInterfaceButton, statusMessage]}
                         position="right center"
                         wide
                         hoverable
                         trigger={<Icon color="grey" name="circle outline" />}
                       />;
        }
      }

      return [
        <Table.Row key={"tr_"+index} warning={updated}>
          <Table.Cell>{statusIcon}   {item.name}</Table.Cell>
          <Table.Cell>
            <Input
              key={"description|"+item.name}
              name={"description|"+item.name}
              defaultValue={fields['description']}
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
          {optionalColumns}
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

  columnSelectorChange = (e, data) => {
    let newDisplayColumns = this.state.displayColumns;
    if (data.checked === true && newDisplayColumns.indexOf(data.name) === -1) {
      newDisplayColumns.push(data.name);
    } else if (data.checked === false) {
      const index = newDisplayColumns.indexOf(data.name);
      if (index > -1) {
        newDisplayColumns.splice(index, 1);
      }
    }
    this.setState({displayColumns: newDisplayColumns});
  }

  render() {
    let interfaceTable = this.renderTableRows(this.state.interfaceData, this.state.interfaceDataUpdated, this.state.vlanOptions);
    let syncStateIcon = this.state.deviceData.synchronized === true ? <Icon name="check" color="green" /> : <Icon name="delete" color="red" />;
    let accordionActiveIndex = this.state.accordionActiveIndex;
    let commitAutopushDisabled = (
      this.state.working || 
      !this.state.initialSyncState ||
      (this.state.initialConfHash != this.state.deviceData.confhash)
    );
    let stateWarning = null;
    if (this.state.initialSyncState === null) {
      stateWarning = <Loader active />;
    } else if (!this.state.initialSyncState || (this.state.initialConfHash != this.state.deviceData.confhash)) {
      stateWarning = <p><Icon name="warning sign" color="orange" size="large" />Device is not synchronized, use dry_run and verify diff to apply changes.</p>;
    }

    const allowedColumns = {
      "vlans": "VLANs",
      "tags": "Tags",
      "json": "Raw JSON",
      "aggregate_id": "LACP aggregate ID",
      "bpdu_filter": "BPDU filter"
    };

    let columnHeaders = this.state.displayColumns.map(columnName => {
      return <Table.HeaderCell width={this.columnWidths[columnName]} key={columnName}>{allowedColumns[columnName]}</Table.HeaderCell>;
    });

    let columnSelectors = Object.keys(allowedColumns).map((columnName, columnIndex) => {
      let checked = false;
      if (this.state.displayColumns.indexOf(columnName) !== -1) {
        checked = true;
      }
      return <li key={columnIndex}><Checkbox defaultChecked={checked} label={allowedColumns[columnName]} name={columnName} onChange={this.columnSelectorChange.bind(this)} /></li>
    })

    let autoPushJobsHTML = this.state.autoPushJobs.map((job, index) => {
      let jobIcon = null;
      if (job.status === "RUNNING") {
        jobIcon = <Icon loading color="grey" name="cog" />;
      } else if (job.status === "FINISHED") {
        jobIcon = <Icon name="check" color="green" />
      } else {
        jobIcon = <Icon name="delete" color="red" />
      }

      if (index == 0) {
        return <li key={index}>Dry run (job ID {job.job_id}) status: {job.status} {jobIcon}</li>;
      } else {
        return <li key={index}>Live run (job ID {job.job_id}) status: {job.status} {jobIcon}</li>;
      }
    });

    let mlagPeerInfo = null;
    if (this.state.mlagPeerHostname !== null) {
      mlagPeerInfo = <p>MLAG peer hostname: <a href={"/interface-config?hostname="+this.state.mlagPeerHostname}>{this.state.mlagPeerHostname}</a></p>;
    }

    return (
      <section>
        <div id="device_list">
          <h2>Interface configuration</h2>
          <p>Hostname: <a href={"/devices?search_hostname="+this.hostname}>{this.hostname}</a>, sync state: {syncStateIcon}</p>
          {mlagPeerInfo}
          {stateWarning}
          <div className="table_options">
            <Popup on='click' pinned position='bottom right' trigger={<Button className="table_options_button"><Icon name="table" /></Button>} >
              <p>Show extra columns:</p>
              <ul>{columnSelectors}</ul>
            </Popup>
          </div>
          <div id="data">
          <Table compact>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={3}>Name</Table.HeaderCell>
                <Table.HeaderCell width={6}>Description</Table.HeaderCell>
                <Table.HeaderCell width={3}>Configtype</Table.HeaderCell>
                {columnHeaders}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {interfaceTable}
            </Table.Body>
            <Table.Footer fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan={3+this.state.displayColumns.length}>
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
                            <p>{this.state.errorMessage}</p>
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
                            <ul>{autoPushJobsHTML}</ul>
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
                  <Button icon labelPosition='right' onClick={this.refreshInterfaceStatus.bind(this)}>
                    Refresh interface status
                    <Icon name="refresh" />
                  </Button>
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
