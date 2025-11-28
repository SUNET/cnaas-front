import _ from "lodash";
import React from "react";
import { Link } from "react-router-dom";
import queryString from "query-string";
import {
  Icon,
  Table,
  Loader,
  Modal,
  Button,
  Accordion,
  Popup,
  Checkbox,
} from "semantic-ui-react";
import YAML from "yaml";
import { getData, getDataHeaders, getDataToken } from "../../utils/getData";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { putData, postData } from "../../utils/sendData";
import { NetboxDevice } from "./NetboxDevice";
import { NewInterface } from "./NewInterface";

const io = require("socket.io-client");

let socket = null;

const ALLOWED_COLUMNS_ACCESS = {
  vlans: "VLANs",
  tags: "Tags",
  json: "Raw JSON",
  aggregate_id: "LACP aggregate ID",
  bpdu_filter: "BPDU filter",
};

const ALLOWED_COLUMNS_DIST = {
  vlans: "VLANs",
  tags: "Tags",
  aggregate_id: "LACP aggregate ID",
  config: "Custom config",
};

const VALID_COLUMNS = new Set([
  ...Object.keys(ALLOWED_COLUMNS_ACCESS),
  ...Object.keys(ALLOWED_COLUMNS_DIST),
]);

class InterfaceConfig extends React.Component {
  state = {
    interfaceData: [],
    interfaceDataUpdated: {},
    interfaceStatusData: {},
    lldpNeighborData: {},
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
    displayColumns: [],
    tagOptions: [],
    portTemplateOptions: [],
    interfaceBounceRunning: {},
    mlagPeerHostname: null,
    interfaceToggleUntagged: {},
    netboxDeviceData: {},
    netboxInterfaceData: [],
  };

  hostname = null;
  device_type = null;

  componentDidMount() {
    this.hostname = this.getDeviceName();
    if (this.hostname !== null) {
      this.getDeviceData()
        .then(() => { // refactor callback to useEffect
          this.getInterfaceData();
          this.getInterfaceStatusData();
          this.getLldpNeighborData();
          this.getNetboxDeviceData(this.hostname);
          this.setDisplayColumns();
        });
    }

    const token = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: token } });
    socket.on("connect", function() {
      console.log("Websocket connected!");
      socket.emit("events", { update: "device" });
      socket.emit("events", { update: "job" });
    });
    socket.on("events", (data) => {
      // device update event
      if (
        data.device_id !== undefined &&
        data.device_id == this.state.deviceData.id &&
        data.action == "UPDATED"
      ) {
        if (
          this.state.awaitingDeviceSynchronization === true &&
          data.object.synchronized === true
        ) {
          // Synchronize done
          this.setState(
            {
              initialSyncState: null,
              initialConfHash: null,
              awaitingDeviceSynchronization: false,
              deviceData: data.object,
            },
            () => {
              this.getInterfaceData();
              this.getDeviceData();
              this.refreshInterfaceStatus();
            },
          );
        } else {
          this.setState({ deviceData: data.object });
        }
        // job update event
      } else if (data.job_id !== undefined) {
        // if job updated state
        const newState = {};
        if (
          data.function_name === "refresh_repo" &&
          this.state.thirdPartyUpdated === false
        ) {
          newState.thirdPartyUpdated = true;
        }
        if (
          this.state.autoPushJobs.length == 1 &&
          this.state.autoPushJobs[0].job_id == data.job_id
        ) {
          // if finished && next_job id, push next_job_id to array
          if (
            data.next_job_id !== undefined &&
            typeof data.next_job_id === "number"
          ) {
            newState.autoPushJobs = [
              data,
              { job_id: data.next_job_id, status: "RUNNING" },
            ];
          } else if (data.status == "FINISHED" || data.status == "EXCEPTION") {
            newState.errorMessage = [
              "Live run job not scheduled! There was an error or the change score was too high to continue with autopush.",
              " Check ",
              <Link key="jobs" to="/jobs">
                job log
              </Link>,
              " or do a ",
              <Link
                key="dryrun"
                to={`/config-change?hostname=${this.hostname}`}
              >
                dry run
              </Link>,
            ];

            newState.working = false;
            newState.autoPushJobs = [data];
            newState.accordionActiveIndex = 2;
          }
        } else if (
          this.state.autoPushJobs.length == 2 &&
          this.state.autoPushJobs[1].job_id == data.job_id
        ) {
          newState.autoPushJobs = [this.state.autoPushJobs[0], data];
          if (data.status == "FINISHED" || data.status == "EXCEPTION") {
            console.log("jobs finished!");
            newState.working = false;
            newState.interfaceDataUpdated = {};
            this.setState({ awaitingDeviceSynchronization: true });
          }
        }
        if (Object.keys(newState).length >= 1) {
          this.setState(newState);
        }
      }
    });
  }

  setDisplayColumns() {
    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};
    let newDisplayColumns;
    if (this.device_type === "ACCESS") {
      newDisplayColumns = interfaceConfig?.accessDisplayColumns;
    } else if (this.device_type === "DIST") {
      newDisplayColumns = interfaceConfig?.distDisplayColumns;
    }

    // Make sure only valid columns are going to be visible
    this.setState({
      displayColumns: (newDisplayColumns ?? ["vlans"]).filter((column) =>
        VALID_COLUMNS.has(column),
      ),
    });
  }

  async getNetboxDeviceData(hostname) {
    if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
      return null;
    }
    let credentials = localStorage.getItem("netboxToken");
    let getFunc = getDataToken;
    let url = process.env.NETBOX_API_URL;
    if (!credentials) {
      credentials = localStorage.getItem("token");
      getFunc = getData;
      url = `${process.env.API_URL}/netbox`;
    }

    try {
      const netboxDevicesUrl = `${url}/api/dcim/devices/?name__ie=${hostname}&tenant_id=${process.env.NETBOX_TENANT_ID}`;
      const data = await getFunc(netboxDevicesUrl, credentials);
      if (data.count === 1) {
        const deviceData = data.results.pop();
        if (deviceData) {
          this.setState(() => ({
            netboxDeviceData: deviceData,
          }));
        }

        const netboxInterfacesUrl = `${url}/api/dcim/interfaces/?device_id=${deviceData.id}&limit=100`;
        const interfaceData = await getFunc(netboxInterfacesUrl, credentials);
        if (interfaceData) {
          this.setState(() => ({
            netboxInterfaceData: interfaceData.results,
          }));
        }
      } else {
        console.log("no data found device", hostname);
      }
    } catch (e) {
      // Some netbox error occurred
      console.log(e);
    }
  }

  getDeviceName() {
    const queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return queryParams.hostname;
    }
    return null;
  }

  async getInterfaceData() {
    const token = localStorage.getItem("token");
    if (this.device_type === "ACCESS") {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;
        const data = await getData(url, token);
        const usedTags = this.state.tagOptions;

        data.data.interfaces.forEach((item) => {
          const ifData = item.data;
          if (ifData !== null && "tags" in ifData) {
            ifData.tags.forEach((tag) => {
              if (usedTags.some((e) => e.text === tag)) {
                return; // don't add duplicate tags
              }
              usedTags.push({ text: tag, value: tag });
            });
          }
        });

        for (const item of data.data.interfaces) {
          const ifData = item.data;
          if ((ifData !== null && "neighbor_id" in ifData) && this.state.mlagPeerHostname == null) {
            try {
              const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
              const mlagData = await getData(mlagDevURL, token);
              this.setState({
                mlagPeerHostname: mlagData.data.devices[0].hostname,
              });
              break;
            } catch (error) {
              console.log(`MLAG peer not found: ${error}`);
            }
          }
        };

        this.setState({
          interfaceData: data.data.interfaces,
          tagOptions: usedTags,
        });
      } catch (error) {
        console.log(error);
      }
    } else if (this.device_type === "DIST") {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/generate_config`;
        const data = await getDataHeaders(url, token, {
          "X-Fields": "available_variables{interfaces,port_template_options}",
        });
        const { tagOptions } = this.state;
        let usedPortTemplates = [];
        const _portTemplateOptions = data.data.config.available_variables.port_template_options;
        if (_portTemplateOptions) {
          usedPortTemplates = Object.entries(_portTemplateOptions)
            .map(([template_name, template_data]) => {
              return {
                text: template_name,
                value: template_name,
                description: template_data.description,
                vlan_config: template_data.vlan_config,
              };
            });
        }

        const usedTags = tagOptions;
        const _availableInterfaces = data.data.config.available_variables.interfaces;
        _availableInterfaces.forEach((item) => {
          if (usedTags.length === 0 && item.tags) {
            item.tags.forEach((tag) => {
              if (usedTags.some((e) => e.text === tag)) {
                return; // don't add duplicate tags
              }
              usedTags.push({ text: tag, value: tag });
            });
          }
          if (item.ifclass.startsWith("port_template")) {
            const templateName = item.ifclass.substring(
              "port_template_".length,
            );
            if (usedPortTemplates.some((e) => e.text === templateName)) {
              return; // don't add duplicate tags
            }
            usedPortTemplates.push({
              text: templateName,
              value: templateName,
            });
          }
        });

        this.setState({
          interfaceData: _availableInterfaces,
          portTemplateOptions: usedPortTemplates,
          tagOptions: usedTags,
        });
      } catch (error) {
        console.log(error);
      };
    }

    if (this.device_type !== "ACCESS" && this.device_type !== "DIST") {
      console.error(`Unsupported device type: ${this.device_type}`);
    }
  }

  async getInterfaceStatusData() {
    const token = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interface_status`;
    try {
      const data = await getData(url, token)
      const interfaceStatus = data.data.interface_status;
      this.setState({
        interfaceStatusData: interfaceStatus,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async getLldpNeighborData() {
    try {
      const token = localStorage.getItem("token");
      const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/lldp_neighbors_detail`;
      const data = await getData(url, token)
      const fetchedLldpNeighsDetail = data.data.lldp_neighbors_detail;
      const lldpNeighbors = {};
      // save interface status data keys as lowercase, in case yaml interface name is not correct case
      Object
        .keys(fetchedLldpNeighsDetail ?? [])
        .forEach((key) => {
          lldpNeighbors[key.toLowerCase()] = fetchedLldpNeighsDetail[key];
        });
      this.setState({
        lldpNeighborData: lldpNeighbors,
      });
    } catch (error) {
      console.log(error);
    }
  }

  refreshInterfaceStatus() {
    this.setState({
      interfaceStatusData: {}, lldpNeighborData: {}
    }, () => { // refactor to useEffect
      this.getInterfaceStatusData();
      this.getLldpNeighborData();
    });
  }

  async getDeviceData() {
    const token = localStorage.getItem("token");
    const settingsUrl = `${process.env.API_URL}/api/v1.0/settings?hostname=${this.hostname}`;
    try {
      const data = await getData(settingsUrl, token)
      const vlanOptions = Object.entries(data.data.settings.vxlans).map(
        ([, vxlan_data]) => {
          return {
            value: vxlan_data.vlan_name,
            text: vxlan_data.vlan_name,
            description: vxlan_data.vlan_id,
          };
        });
      const untaggedVlanOptions = [...vlanOptions];
      untaggedVlanOptions.push({
        value: null,
        text: "None",
        description: "NA",
      });
      // look for tag options
      let settingsTagOptions = [];
      const interfaceTagOptions = data.data.settings.interface_tag_options;
      if (interfaceTagOptions) {
        settingsTagOptions = Object.entries(interfaceTagOptions)
          .map(([tag_name, tag_data]) => {
            return {
              text: tag_name,
              value: tag_name,
              description: tag_data.description,
            };
          });
      }

      this.setState({
        deviceSettings: data.data.settings,
        vlanOptions,
        untaggedVlanOptions,
        tagOptions: settingsTagOptions,
      });
    } catch (error) {
      console.log(error);
    }

    try {
      const deviceUrl = `${process.env.API_URL}/api/v1.0/device/${this.hostname}`;
      const fetchedDevice = await getData(deviceUrl, token);
      const newState = {
        deviceData: fetchedDevice.data.devices[0],
        editDisabled: !fetchedDevice.data.devices[0].synchronized,
      };
      if (this.state.initialSyncState == null) {
        newState.initialSyncState = fetchedDevice.data.devices[0].synchronized;
        newState.initialConfHash = fetchedDevice.data.devices[0].confhash;
      }
      this.setState(newState);
      this.device_type = newState.deviceData.device_type;
    } catch (error) {
      console.log(error);
    }
  }

  prepareSendJson(interfaceData) {
    const topLevelKeyNames = ["configtype"];
    // build object in the format API expects interfaces{} -> name{} -> configtype,data{}
    const sendData = { interfaces: {} };
    Object.entries(interfaceData).map(([interfaceName, formData]) => {
      const topLevelKeys = {};
      const dataLevelKeys = {};
      Object.entries(formData).map(([formKey, formValue]) => {
        if (topLevelKeyNames.includes(formKey)) {
          topLevelKeys[formKey] = formValue;
        } else {
          dataLevelKeys[formKey] = formValue;
        }
      });
      if (Object.keys(dataLevelKeys).length >= 1) {
        topLevelKeys.data = dataLevelKeys;
      }
      sendData.interfaces[interfaceName] = topLevelKeys;
    });
    return sendData;
  }

  prepareYaml(interfaceData) {
    const sendData = { interfaces: [] };
    Object.entries(interfaceData).map(([interfaceName, formData]) => {
      const ifData = { name: interfaceName };
      this.state.interfaceData.forEach((intf) => {
        if (intf.name == interfaceName) {
          Object.entries(intf).map(([prevKey, prevValue]) => {
            if (
              prevKey === "indexnum" ||
              prevValue === null ||
              prevValue === "" ||
              (prevKey === "redundant_link" && prevValue === true) ||
              prevKey === "data"
            ) {
              // skip these keys since they are not needed in rendered yaml
            } else {
              ifData[prevKey] = prevValue;
            }
          });
        }
      });
      let skipIfClass = false;
      Object.entries(formData).map(([formKey, formValue]) => {
        // port_template is not a separate value in the result yaml, but a suffix on ifclass
        if (formKey == "port_template") {
          if (formData.ifclass == "port_template" || !("ifclass" in formData)) {
            ifData.ifclass = `port_template_${formData.port_template}`;
            skipIfClass = true;
          }
        } else if (formKey == "ifclass") {
          if (skipIfClass === false) {
            ifData.ifclass = formData.ifclass;
          }
        } else {
          ifData[formKey] = formValue;
        }
      });
      sendData.interfaces.push(ifData);
    });

    return sendData;
  }

  async sendInterfaceData() {
    try {
      const token = localStorage.getItem("token");
      const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;
      const sendData = this.prepareSendJson(this.state.interfaceDataUpdated);

      const data = await putData(url, token, sendData);

      if (data.status === "success") {
        return true;
      }

      this.setState({ errorMessage: data.message });
      return false;
    } catch (error) {
      console.log(error);
      this.setState({ errorMessage: error.message.errors.join(", ") });
      return false;
    }
  }

  async startSynctoAutopush() {
    const token = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
    const sendData = {
      dry_run: true,
      comment: "interface update via WebUI",
      hostname: this.hostname,
      auto_push: true,
    };

    const data = await postData(url, token, sendData);

    if (data) {
      this.setState({
        autoPushJobs: [{ job_id: data.job_id, status: "RUNNING" }],
        working: true,
      });
    }
  }

  async saveAndCommitChanges() {
    const saveStatus = await this.sendInterfaceData();
    if (saveStatus) {
      this.startSynctoAutopush();
      this.setState({ accordionActiveIndex: 3 });
    } else {
      this.setState({ accordionActiveIndex: 2 });
    }
  }

  async saveChanges() {
    const saveStatus = await this.sendInterfaceData();
    if (saveStatus) {
      this.props.history.push(
        `/config-change?hostname=${this.hostname}&scrollTo=dry_run&autoDryRun=true`,
      );
    } else {
      this.setState({ accordionActiveIndex: 2 });
    }
  }

  gotoConfigChange() {
    this.props.history.push(
      `/config-change?hostname=${this.hostname}&scrollTo=refreshrepo`,
    );
  }

  addNewInterface(interfaceName) {
    this.setState((prevState) => ({
      interfaceData: [
        { name: interfaceName, ifclass: "custom", tags: null },
        ...prevState.interfaceData,
      ],
    }));
  }

  addTagOption = (_e, data) => {
    const { value } = data;
    this.setState((prevState) => ({
      tagOptions: [{ text: value, value }, ...prevState.tagOptions],
    }));
  };

  addPortTemplateOption = (_e, data) => {
    const { value } = data;
    this.setState((prevState) => ({
      portTemplateOptions: [
        { text: value, value },
        ...prevState.portTemplateOptions,
      ],
    }));
  };

  updateFieldData = (_e, data) => {
    const nameSplit = data.name.split("|", 2);
    const interfaceName = nameSplit[1];
    const json_key = nameSplit[0];
    const defaultValue = "defaultChecked" in data ? data.defaultChecked : data.defaultValue;
    let val = "defaultChecked" in data ? data.checked : data.value;

    if (
      this.device_type == "DIST" &&
      ["untagged_vlan", "tagged_vlan_list"].includes(json_key)
    ) {
      // Get VLAN ID instead of name by looking in the description field of the options
      if (data.value instanceof Array) {
        val = data.value.map((opt) => {
          return data.options.filter((e) => {
            return e.value == opt;
          })[0].description;
        });
      } else {
        val = data.options.filter((e) => {
          return e.value == data.value;
        })[0].description;
      }
    }
    if (["aggregate_id"].includes(json_key)) {
      val = parseInt(val, 10);
      if (isNaN(val)) {
        val = null;
      }
    }
    const newData = this.state.interfaceDataUpdated;
    if (JSON.stringify(val) !== JSON.stringify(defaultValue)) {
      if (interfaceName in newData) {
        const newInterfaceData = newData[interfaceName];
        newInterfaceData[json_key] = val;
        newData[interfaceName] = newInterfaceData;
      } else {
        const newData = this.state.interfaceDataUpdated;
        newData[interfaceName] = { [json_key]: val };
      }
    } else if (newData[interfaceName]) {
      if (json_key in newData[interfaceName]) {
        delete newData[interfaceName][json_key];
      }
      if (Object.keys(newData[interfaceName]).length == 0) {
        delete newData[interfaceName];
      }
    }
    if (json_key === "ifclass") {
      if (val !== "port_template") {
        delete newData[interfaceName].port_template;
        console.log(newData);
      }
    }
    this.setState({
      interfaceDataUpdated: newData,
    });
  };

  async submitBounce(intf) {
    this.setState(prev => ({
      interfaceBounceRunning: {
        ...prev.interfaceBounceRunning,
        [intf]: "running",
      },
    }));

    const token = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interface_status`;
    const sendData = { bounce_interfaces: [intf] };

    try {
      const data = await putData(url, token, sendData);
      const success = data.status === "success";
      this.setState(prev => ({
        interfaceBounceRunning: {
          ...prev.interfaceBounceRunning,
          [intf]: success ? "finished" : `error: ${data.data}`,
        },
      }));
    } catch (error) {
      console.log(error);
      this.setState(prev => ({
        interfaceBounceRunning: {
          ...prev.interfaceBounceRunning,
          [intf]: `error: ${error}`,
        },
      }));
    };
  }

  untaggedClick = (_e, data) => {
    const { interfaceToggleUntagged } = this.state.interfaceToggleUntagged;
    if (data.name === "untagged") {
      // Untagged button was clicked
      interfaceToggleUntagged[data.id] = true;
      this.setState({ interfaceToggleUntagged: interfaceToggleUntagged });
    } else {
      // Tagged button was clicked
      delete interfaceToggleUntagged[data.id];
      this.setState({ interfaceToggleUntagged: newData });
    }
  };

  mapVlanToName(vlan, vlanOptions) {
    if (typeof vlan === "number") {
      const mapped = vlanOptions.find(opt => opt.description === vlan);
      return mapped ? mapped.value : vlan;
    }
    return vlan;
  }

  accordionClick = (_e, titleProps) => {
    const { index } = titleProps;
    const { accordionActiveIndex } = this.state;
    const newIndex = accordionActiveIndex === index ? -1 : index;

    this.setState({ accordionActiveIndex: newIndex });
  };

  columnSelectorChange = (_e, data) => {
    let COLUMN_ORDER;
    if (this.device_type === "ACCESS") {
      COLUMN_ORDER = Object.keys(ALLOWED_COLUMNS_ACCESS);
    } else if (this.device_type === "DIST") {
      COLUMN_ORDER = Object.keys(ALLOWED_COLUMNS_DIST);
    }

    const newDisplayColumns = this.state.displayColumns;
    if (data.checked === true && newDisplayColumns.indexOf(data.name) === -1) {
      newDisplayColumns.push(data.name);
    } else if (data.checked === false) {
      const index = newDisplayColumns.indexOf(data.name);
      if (index > -1) {
        newDisplayColumns.splice(index, 1);
      }
    }

    // Sort columns by their position in the predefined order
    newDisplayColumns.sort(
      (a, b) => COLUMN_ORDER.indexOf(a) - COLUMN_ORDER.indexOf(b),
    );

    this.setState({ displayColumns: newDisplayColumns });
    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};

    if (this.device_type === "ACCESS") {
      interfaceConfig.accessDisplayColumns = newDisplayColumns;
    } else if (this.device_type === "DIST") {
      interfaceConfig.distDisplayColumns = newDisplayColumns;
    }

    localStorage.setItem("interfaceConfig", JSON.stringify(interfaceConfig));
  };

  render() {
    const interfaceTable = this.state.interfaceData.map((item, index) => (
      <InterfaceTableRow
        key={item.name}
        item={item}
        index={index}
        deviceType={this.device_type}
        interfaceDataUpdated={this.state.interfaceDataUpdated}
        vlanOptions={this.state.vlanOptions}
        untaggedVlanOptions={this.state.untaggedVlanOptions}
        displayColumns={this.state.displayColumns}
        deviceSettings={this.state.deviceSettings}
        tagOptions={this.state.tagOptions}
        portTemplateOptions={this.state.portTemplateOptions}
        interfaceStatusData={this.state.interfaceStatusData}
        interfaceBounceRunning={this.state.interfaceBounceRunning}
        netboxInterfaceData={this.state.netboxInterfaceData}
        lldpNeighborData={this.state.lldpNeighborData}
        hostname={this.hostname}
        updateFieldData={this.updateFieldData}
        addTagOption={this.addTagOption}
        addPortTemplateOption={this.addPortTemplateOption}
        submitBounce={() => this.submitBounce(item.name)}
        untaggedClick={this.untaggedClick}
        interfaceToggleUntagged={this.state.interfaceToggleUntagged}
      />
    ));

    const syncStateIcon =
      this.state.deviceData.synchronized === true ? (
        <Icon name="check" color="green" />
      ) : (
        <Icon name="delete" color="red" />
      );

    const { accordionActiveIndex } = this.state;
    const commitAutopushDisabled =
      this.state.working ||
      !this.state.initialSyncState ||
      this.state.initialConfHash != this.state.deviceData.confhash;
    let stateWarning = null;
    if (this.state.initialSyncState === null) {
      stateWarning = <Loader active />;
    } else if (
      !this.state.initialSyncState ||
      this.state.initialConfHash != this.state.deviceData.confhash
    ) {
      stateWarning = (
        <p>
          <Icon name="warning sign" color="orange" size="large" />
          Device is not synchronized, use dry_run and verify diff to apply
          changes.
        </p>
      );
    }

    let allowedColumns = {};

    if (this.device_type == "ACCESS") {
      allowedColumns = ALLOWED_COLUMNS_ACCESS;
    } else if (this.device_type == "DIST") {
      allowedColumns = ALLOWED_COLUMNS_DIST;
    }

    const columnHeaders = this.state.displayColumns.map((columnName) => {
      const columnWidths = {
        vlans: 4,
        tags: 3,
        json: 1,
        aggregate_id: 3,
        bpdu_filter: 1,
      };

      return (
        <Table.HeaderCell width={columnWidths[columnName]} key={columnName}>
          {allowedColumns[columnName]}
        </Table.HeaderCell>
      );
    });

    const columnSelectors = Object.keys(allowedColumns).map(
      (columnName, columnIndex) => {
        let checked = false;
        let disabled = false;
        if (this.state.displayColumns.indexOf(columnName) !== -1) {
          checked = true;
        }
        // if value has been changed for an optional column, don't allow
        // hiding that column since the defaultValue will be wrong if re-adding it later
        Object.values(this.state.interfaceDataUpdated).forEach((ifData) => {
          if (Object.keys(ifData).includes(columnName)) {
            disabled = true;
          }
        });

        return (
          <li key={columnIndex}>
            <Checkbox
              defaultChecked={checked}
              disabled={disabled}
              label={allowedColumns[columnName]}
              name={columnName}
              onChange={this.columnSelectorChange.bind(this)}
            />
          </li>
        );
      },
    );

    const autoPushJobsHTML = this.state.autoPushJobs.map((job, index) => {
      let jobIcon = null;
      if (job.status === "RUNNING") {
        jobIcon = <Icon loading color="grey" name="cog" />;
      } else if (job.status === "FINISHED") {
        jobIcon = <Icon name="check" color="green" />;
      } else {
        jobIcon = <Icon name="delete" color="red" />;
      }

      if (index == 0) {
        return (
          <li key={index}>
            Dry run (job ID {job.job_id}) status: {job.status} {jobIcon}
          </li>
        );
      }
      return (
        <li key={index}>
          Live run (job ID {job.job_id}) status: {job.status} {jobIcon}
        </li>
      );
    });

    let mlagPeerInfo = null;
    if (this.state.mlagPeerHostname !== null) {
      mlagPeerInfo = (
        <p>
          MLAG peer hostname:{" "}
          <a href={`/interface-config?hostname=${this.state.mlagPeerHostname}`}>
            {this.state.mlagPeerHostname}
          </a>
        </p>
      );
    }

    let netboxInfo = null;
    if (this.state.netboxDeviceData) {
      netboxInfo = <NetboxDevice netboxDevice={this.state.netboxDeviceData} />;
    }

    let commitModal = null;
    if (this.device_type == "ACCESS") {
      commitModal = (
        <Modal.Content>
          <Modal.Description>
            <Accordion>
              <Accordion.Title
                active={accordionActiveIndex === 1}
                index={1}
                onClick={this.accordionClick}
              >
                <Icon name="dropdown" />
                POST JSON:
              </Accordion.Title>
              <Accordion.Content active={accordionActiveIndex === 1}>
                <pre>
                  {JSON.stringify(
                    this.prepareSendJson(this.state.interfaceDataUpdated),
                    null,
                    2,
                  )}
                </pre>
              </Accordion.Content>
              <Accordion.Title
                active={accordionActiveIndex === 2}
                index={2}
                onClick={this.accordionClick}
              >
                <Icon name="dropdown" />
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
                <Icon name="dropdown" />
                Job output:
              </Accordion.Title>
              <Accordion.Content active={accordionActiveIndex === 3}>
                <ul>{autoPushJobsHTML}</ul>
              </Accordion.Content>
            </Accordion>
          </Modal.Description>
        </Modal.Content>
      );
    } else if (this.device_type == "DIST") {
      const editUrl = process.env.SETTINGS_WEB_URL.split("/")
        .slice(0, 5)
        .join("/");
      const yaml = YAML.stringify(
        this.prepareYaml(this.state.interfaceDataUpdated),
        null,
        2,
      );
      commitModal = (
        <Modal.Content>
          <Modal.Description>
            <Accordion>
              <Accordion.Title active index={1}>
                <Icon name="dropdown" />
                YAML:
              </Accordion.Title>
              <Accordion.Content active>
                <pre>{yaml}</pre>
                <Popup
                  content="Copy YAML"
                  trigger={
                    <Button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          yaml.split("\n").slice(1).join("\n"),
                        )
                      }
                      icon="copy"
                      size="tiny"
                    />
                  }
                  position="bottom right"
                />
                <p>
                  <a
                    href={`${editUrl}/_edit/main/devices/${this.hostname}/interfaces.yml`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edit in Git
                  </a>{" "}
                  (edit and commit the file in git before starting dry run)
                </p>
              </Accordion.Content>
            </Accordion>
          </Modal.Description>
        </Modal.Content>
      );
    }

    // find unused interfaces
    const { interfaceData, interfaceStatusData } = this.state;
    const unusedInterfaces = interfaceStatusData
      ? Object.keys(interfaceStatusData).filter((ifName) => {
        return !interfaceData.find((obj) => obj.name.toLowerCase() === ifName.toLowerCase());
      })
      : [];

    return (
      <section>
        <div id="device_list">
          <h2>Interface configuration</h2>
          <p>
            Hostname:{" "}
            <a href={`/devices?search_hostname=${this.hostname}`}>
              {this.hostname}
            </a>
            , sync state: {syncStateIcon}
          </p>
          {mlagPeerInfo}
          {stateWarning}
          {netboxInfo}
          <div className="table_options">
            <Popup
              on="click"
              pinned
              position="bottom right"
              trigger={
                <Button
                  className="table_options_button"
                  icon
                  basic
                  size="small"
                  title="Select Columns"
                >
                  <Icon name="columns" />
                </Button>
              }
            >
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
                  <Table.HeaderCell width={3}>
                    {this.device_type == "DIST"
                      ? "Interface class"
                      : "Configtype"}
                  </Table.HeaderCell>
                  {columnHeaders}
                </Table.Row>
              </Table.Header>
              <Table.Body>{interfaceTable}</Table.Body>
              <Table.Footer fullWidth>
                <Table.Row>
                  <Table.HeaderCell
                    colSpan={3 + this.state.displayColumns.length}
                  >
                    <Modal
                      onClose={() => this.setState({ save_modal_open: false })}
                      onOpen={() => this.setState({ save_modal_open: true })}
                      open={this.state.save_modal_open}
                      trigger={
                        <Button icon labelPosition="right">
                          Save & commit...
                          <Icon name="window restore outline" />
                        </Button>
                      }
                    >
                      <Modal.Header>Save & commit</Modal.Header>
                      {commitModal}
                      <Modal.Actions>
                        <Button
                          key="close"
                          color="black"
                          onClick={() =>
                            this.setState({
                              save_modal_open: false,
                              autoPushJobs: [],
                              errorMessage: null,
                              accordionActiveIndex: 0,
                            })
                          }
                        >
                          Close
                        </Button>
                        {this.device_type === "ACCESS" && [
                          <Button
                            key="submit"
                            onClick={this.saveAndCommitChanges.bind(this)}
                            disabled={commitAutopushDisabled}
                            color="yellow"
                          >
                            Save and commit now
                          </Button>,
                          <Button
                            key="dryrun"
                            onClick={this.saveChanges.bind(this)}
                            disabled={this.state.working}
                            positive
                          >
                            Save and dry run...
                          </Button>,
                        ]}
                        {this.device_type === "DIST" && [
                          <Button
                            key="dryrun"
                            onClick={this.gotoConfigChange.bind(this)}
                            positive
                          >
                            Start dry run...
                          </Button>,
                        ]}
                      </Modal.Actions>
                    </Modal>
                    <Button
                      icon
                      labelPosition="right"
                      onClick={this.refreshInterfaceStatus.bind(this)}
                    >
                      Refresh interface status
                      <Icon name="refresh" />
                    </Button>
                    {this.device_type === "DIST" && [
                      <NewInterface
                        suggestedInterfaces={unusedInterfaces}
                        addNewInterface={this.addNewInterface.bind(this)}
                        key="newinterface"
                      />,
                    ]}
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Footer>
            </Table>
          </div>
        </div>
      </section>
    );
  }
}

export default InterfaceConfig;
