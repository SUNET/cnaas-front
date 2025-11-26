import _ from "lodash";
import React from "react";
import { Link } from "react-router-dom";
import queryString from "query-string";
import {
  Input,
  Dropdown,
  Icon,
  Table,
  Loader,
  Modal,
  Button,
  ButtonGroup,
  Accordion,
  Popup,
  Checkbox,
  TextArea,
} from "semantic-ui-react";
import YAML from "yaml";
import { getData, getDataHeaders, getDataToken } from "../../utils/getData";
import { InterfaceCurrentConfig } from "./InterfaceCurrentConfig";
import { putData, postData } from "../../utils/sendData";
import { GraphiteInterface } from "./GraphiteInterface";
import { NetboxDevice } from "./NetboxDevice";
import { NetboxInterfacePopup } from "./NetboxInterfacePopup";
import { LldpNeighborPopup } from "./LldpNeighborPopup";
import { NewInterface } from "./NewInterface";

const io = require("socket.io-client");

let socket = null;

function InterfaceStatusUp({
  name,
  speed,
  toggleEnabled,
  bounceInterfaceButton,
  statusMessage,
  graphiteHtml,
}) {
  return (
    <Popup
      header={name}
      content={[
        <p key="status">Interface is up, speed: {speed} Mbit/s</p>,
        toggleEnabled,
        bounceInterfaceButton,
        statusMessage,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="green" name="circle" />}
    />
  );
}

function InterfaceStatusAdminDisabled({ name, toggleEnabled, graphiteHtml }) {
  return (
    <Popup
      header={name}
      content={[
        <p key="status">Interface is admin disabled</p>,
        toggleEnabled,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="red" name="circle" />}
    />
  );
}

function InterfaceStatusDown({
  name,
  toggleEnabled,
  bounceInterfaceButton,
  statusMessage,
  graphiteHtml,
}) {
  return (
    <Popup
      header={name}
      content={[
        <p key="status">Interface is down</p>,
        toggleEnabled,
        bounceInterfaceButton,
        statusMessage,
        graphiteHtml,
      ]}
      position="right center"
      wide
      hoverable
      trigger={<Icon color="grey" name="circle outline" />}
    />
  );
}

function PortTypeCellAccess({
  currentConfigtype,
  editDisabled,
  fields,
  item,
  updateFieldData,
}) {
  const configTypeOptions = [
    { value: "ACCESS_AUTO", text: "Auto/dot1x" },
    { value: "ACCESS_UNTAGGED", text: "Untagged/access" },
    { value: "ACCESS_TAGGED", text: "Tagged/trunk" },
    { value: "ACCESS_DOWNLINK", text: "Downlink" },
    { value: "ACCESS_UPLINK", text: "Uplink", disabled: true },
    { value: "MLAG_PEER", text: "MLAG peer interface", disabled: true },
  ];

  return (
    <Table.Cell>
      <Dropdown
        key={`configtype|${item.name}`}
        name={`configtype|${item.name}`}
        selection
        options={configTypeOptions}
        defaultValue={item.configtype}
        disabled={editDisabled}
        onChange={updateFieldData}
      />

      {currentConfigtype === "ACCESS_DOWNLINK" && (
        <Popup
          key="doIneedThisKey?"
          header="Redundant Link: true/false"
          content="Disable ZTP redundant link check for this downlink interface by unchecking this box"
          wide
          trigger={
            <Checkbox
              key={`redundant_link|${item.name}`}
              name={`redundant_link|${item.name}`}
              defaultChecked={fields.redundant_link}
              disabled={editDisabled}
              onChange={updateFieldData}
            />
          }
        />
      )}
    </Table.Cell>
  );
}

const IF_CLASS_OPTIONS = [
  { value: "downlink", text: "Downlink" },
  { value: "fabric", text: "Fabric link" },
  { value: "custom", text: "Custom" },
  { value: "port_template", text: "Port template" },
];

function PortTypeCellDist({
  currentIfClass,
  editDisabled,
  item,
  addPortTemplateOption,
  updateFieldData,
  portTemplate,
  portTemplateOptions,
}) {

  return (
    <Table.Cell>
      <Dropdown
        key={`ifclass|${item.name}`}
        name={`ifclass|${item.name}`}
        selection
        options={IF_CLASS_OPTIONS}
        defaultValue={currentIfClass}
        disabled={editDisabled}
        onChange={updateFieldData}
      />
      {currentIfClass == "port_template" && (
        <Dropdown
          key={`port_template|${item.name}`}
          name={`port_template|${item.name}`}
          fluid
          selection
          search
          allowAdditions
          options={portTemplateOptions}
          defaultValue={portTemplate}
          disabled={editDisabled}
          onAddItem={addPortTemplateOption}
          onChange={updateFieldData}
        />
      )}
    </Table.Cell>
  );
}

function BounceInterfaceButton({
  handleClick, editDisabled, bounceDisabled
}) {
  return (
    <Button
      disabled={editDisabled || bounceDisabled}
      loading={bounceDisabled}
      icon
      labelPosition="right"
      onClick={handleClick}
      size="small"
    >
      Bounce interface {<Icon name="retweet" />}
    </Button>
  );
}

const CONFIG_TYPES_ENABLED = [
  "ACCESS_AUTO",
  "ACCESS_UNTAGGED",
  "ACCESS_TAGGED",
  "ACCESS_DOWNLINK",
];

const IF_CLASSES_ENABLED = ["custom", "downlink"]; // anything starting with port_template is also allowed

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

    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
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
    const credentials = localStorage.getItem("token");
    if (this.device_type === "ACCESS") {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;
        const data = await getData(url, credentials);
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
              const mlagData = await getData(mlagDevURL, credentials);
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
        const data = await getDataHeaders(url, credentials, {
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
      const lldpNeighbors = {};
      // save interface status data keys as lowercase, in case yaml interface name is not correct case
      Object.keys(data.data.lldp_neighbors_detail).forEach((key) => {
        lldpNeighbors[key.toLowerCase()] =
          data.data.lldp_neighbors_detail[key];
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
      const credentials = localStorage.getItem("token");
      const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;

      const sendData = this.prepareSendJson(this.state.interfaceDataUpdated);

      const data = await putData(url, credentials, sendData);

      if (data.status === "success") {
        return true;
      }

      this.setState({ errorMessage: data.message });
      return false;
    } catch (error) {
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
    let val = null;
    let defaultValue = null;
    if ("defaultChecked" in data) {
      defaultValue = data.defaultChecked;
      val = data.checked;
    } else {
      defaultValue = data.defaultValue;
      val = data.value;
    }
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
        console.log(`${json_key} value is not a number`);
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
      this.setState(prev => ({
        interfaceBounceRunning: {
          ...prev.interfaceBounceRunning,
          [intf]: `error: ${error}`,
        },
      }));
    };
  }

  untaggedClick = (_e, data) => {
    if (data.name === "untagged") {
      // Untagged button was clicked
      const newData = this.state.interfaceToggleUntagged;
      newData[data.id] = true;
      this.setState({ interfaceToggleUntagged: newData });
    } else {
      // Tagged button was clicked
      const newData = this.state.interfaceToggleUntagged;
      delete newData[data.id];
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

  renderTableRows(interfaceData, interfaceDataUpdated, vlanOptions) {
    return interfaceData.map((item, index) => {
      const ifDataUpdated = item.name in interfaceDataUpdated ? interfaceDataUpdated[item.name] : null;
      const updated = item.name in interfaceDataUpdated ? true : null;

      let editDisabled = true;
      if (this.device_type === "ACCESS") {
        editDisabled = !CONFIG_TYPES_ENABLED.includes(item.configtype);
      } else if (this.device_type === "DIST") {
        if (item.ifclass.startsWith("port_template")) {
          editDisabled = false;
        } else {
          editDisabled = !IF_CLASSES_ENABLED.includes(item.ifclass);
        }
      }

      let fields = {};
      if (this.device_type === "ACCESS") {
        fields = {
          description: "",
          untagged_vlan: null,
          tagged_vlan_list: null,
          tags: [],
          enabled: true,
          aggregate_id: null,
          bpdu_filter: false,
          redundant_link: true,
        };
      } else if (this.device_type === "DIST") {
        fields = {
          description: "",
          untagged_vlan: null,
          tagged_vlan_list: [],
          tags: [],
          enabled: true,
          config: "",
        };
      }

      let ifData = item.data;
      // populate ifData for DIST
      if (this.device_type === "DIST") {
        ifData = {};

        Object.entries(fields).forEach(([key, value]) => {
          ifData[key] = item[key] ? item[key] : value;
        });

        if ("peer_hostname" in item) {
          ifData.description = item.peer_hostname;
        }
      }

      if (ifData) {
        if ("description" in ifData) {
          fields.description = ifData.description;
        } else if ("neighbor" in ifData) {
          fields.description = `Uplink to ${ifData.neighbor}`;
        } else if ("neighbor_id" in ifData) {
          fields.description = "MLAG peer link";
        }

        [
          "aggregate_id",
          "bpdu_filter",
          "enabled",
          "redundant_link",
          "tags"
        ].forEach((fieldName) => {
          if (fieldName in ifData) {
            fields[fieldName] = ifData[fieldName];
          }
        });

        if (ifDataUpdated && "untagged_vlan" in ifDataUpdated) {
          fields.untagged_vlan = ifDataUpdated.untagged_vlan;
        } else if ("untagged_vlan" in ifData) {
          fields.untagged_vlan = this.mapVlanToName(ifData.untagged_vlan, vlanOptions);
        }

        if (ifDataUpdated !== null && "tagged_vlan_list" in ifDataUpdated) {
          fields.tagged_vlan_list = ifDataUpdated.tagged_vlan_list;
        } else if ("tagged_vlan_list" in ifData) {
          fields.tagged_vlan_list = ifData.tagged_vlan_list.map((vlan_item) => {
            if (typeof vlan_item === "number") {
              const vlan_mapped = vlanOptions.filter(
                (vlanOptionItem) => vlanOptionItem.description === vlan_item,
              );
              if (Array.isArray(vlan_mapped) && vlan_mapped.length === 1) {
                return vlan_mapped[0].value;
              }
              return vlan_item;
            }
            return vlan_item;
          });
        }
      } else if (ifDataUpdated !== null) {
        [
          "aggregate_id",
          "bpdu_filter",
          "enabled",
          "redundant_link",
          "tagged_vlan_list",
          "tags",
          "untagged_vlan",
        ].forEach((fieldName) => {
          if (fieldName in ifDataUpdated) {
            fields[fieldName] = ifDataUpdated[fieldName];
          }
        });
      }

      let currentConfigtype = null;
      let currentIfClass = null;
      let displayVlan = false;
      let displayVlanTagged = false;
      let displayTaggedToggle = false;
      let portTemplate = null;
      let currentEnabled = null;
      if (this.device_type === "ACCESS") {
        currentConfigtype = item.configtype;
        if (
          item.name in this.state.interfaceDataUpdated &&
          "configtype" in this.state.interfaceDataUpdated[item.name]
        ) {
          currentConfigtype =
            this.state.interfaceDataUpdated[item.name].configtype;
        }
        if (currentConfigtype === "ACCESS_TAGGED") {
          displayVlanTagged = true;
          displayTaggedToggle = true;
        }
        if (
          currentConfigtype === "ACCESS_TAGGED" ||
          currentConfigtype === "ACCESS_UNTAGGED"
        ) {
          displayVlan = true;
        }
        if (item.name in this.state.interfaceToggleUntagged) {
          displayVlanTagged = !displayVlanTagged;
        }
        currentEnabled = fields.enabled;
        if (
          item.name in this.state.interfaceDataUpdated &&
          "enabled" in this.state.interfaceDataUpdated[item.name]
        ) {
          currentEnabled = this.state.interfaceDataUpdated[item.name].enabled;
        }
      } else if (this.device_type == "DIST") {
        if (item.ifclass.startsWith("port_template")) {
          currentIfClass = "port_template";
        } else {
          currentIfClass = item.ifclass;
        }
        if (
          item.name in this.state.interfaceDataUpdated &&
          "ifclass" in this.state.interfaceDataUpdated[item.name]
        ) {
          currentIfClass = this.state.interfaceDataUpdated[item.name].ifclass;
        }
        if (currentIfClass.startsWith("port_template")) {
          if (
            item.name in this.state.interfaceDataUpdated &&
            "port_template" in this.state.interfaceDataUpdated[item.name]
          ) {
            portTemplate =
              this.state.interfaceDataUpdated[item.name].port_template;
          } else {
            portTemplate = item.ifclass.substring("port_template_".length);
          }
          // if portTemplate is available in usedPortTemplates
          const { portTemplateOptions } = this.state;
          // if portTemplate exists in text field of any object in portTemplateOptions
          const dropDownEntry = portTemplateOptions.find(
            (obj) => obj.text === portTemplate,
          );

          if (dropDownEntry && dropDownEntry.vlan_config !== undefined) {
            if (dropDownEntry.vlan_config === "untagged") {
              displayVlan = true;
              displayVlanTagged = false;
            } else if (dropDownEntry.vlan_config === "tagged") {
              displayVlan = true;
              displayVlanTagged = true;
              displayTaggedToggle = true;
            }
          } else {
            displayVlan = true;
            displayVlanTagged = true;
            displayTaggedToggle = true;
          }

          // mirror ifclass
        } else {
          displayVlanTagged = false;
        }
        if (item.name in this.state.interfaceToggleUntagged) {
          displayVlanTagged = !displayVlanTagged;
        }
        currentEnabled = fields.enabled;
        if (
          item.name in this.state.interfaceDataUpdated &&
          "enabled" in this.state.interfaceDataUpdated[item.name]
        ) {
          currentEnabled = this.state.interfaceDataUpdated[item.name].enabled;
        }
      }

      const optionalColumns = this.state.displayColumns.map((columnName) => {
        let colData = [];
        if (columnName === "vlans") {
          if (this.state.deviceSettings === null) {
            colData = [<Loader key="loading" inline active />];
          } else if (vlanOptions.length == 0) {
            colData = [<p>No VLANs available</p>];
          } else if (displayVlan) {
            if (displayVlanTagged) {
              colData = [
                <Dropdown
                  key={`tagged_vlan_list|${item.name}`}
                  name={`tagged_vlan_list|${item.name}`}
                  fluid
                  multiple
                  selection
                  search={(filteredOptions, searchQuery) => {
                    const re = new RegExp(_.escapeRegExp(searchQuery), "i");
                    return _.filter(
                      filteredOptions,
                      (opt) =>
                        re.test(opt.text) ||
                        re.test(opt.description.toString()),
                    );
                  }}
                  options={this.state.vlanOptions}
                  defaultValue={fields.tagged_vlan_list}
                  onChange={this.updateFieldData}
                />,
              ];
            } else {
              colData = [
                <Dropdown
                  key={`untagged_vlan|${item.name}`}
                  name={`untagged_vlan|${item.name}`}
                  fluid
                  selection
                  search={(filteredOptions, searchQuery) => {
                    const re = new RegExp(_.escapeRegExp(searchQuery), "i");
                    return _.filter(
                      filteredOptions,
                      (opt) =>
                        re.test(opt.text) ||
                        re.test(opt.description.toString()),
                    );
                  }}
                  options={this.state.untaggedVlanOptions}
                  defaultValue={fields.untagged_vlan}
                  onChange={this.updateFieldData}
                />,
              ];
            }
            if (displayTaggedToggle) {
              colData.push(
                <ButtonGroup key="toggle_tagged" size="mini" vertical>
                  <Popup
                    key="untagged_popup"
                    content="Change untagged VLAN"
                    position="top right"
                    trigger={
                      <Button
                        id={item.name}
                        name="untagged"
                        onClick={this.untaggedClick.bind(this)}
                        active={item.name in this.state.interfaceToggleUntagged}
                        className="table-button-compact"
                      >
                        U
                      </Button>
                    }
                  />
                  <Popup
                    key="tagged_popup"
                    content="Change list of tagged VLANs"
                    position="bottom right"
                    trigger={
                      <Button
                        id={item.name}
                        named="tagged"
                        onClick={this.untaggedClick.bind(this)}
                        active={
                          !(item.name in this.state.interfaceToggleUntagged)
                        }
                        className="table-button-compact"
                      >
                        T
                      </Button>
                    }
                  />
                  ,
                </ButtonGroup>,
              );
            }
          }
        } else if (columnName == "tags") {
          colData = [
            <Dropdown
              key={`tags|${item.name}`}
              name={`tags|${item.name}`}
              fluid
              multiple
              selection
              search
              allowAdditions
              options={this.state.tagOptions}
              defaultValue={fields.tags}
              onAddItem={this.addTagOption}
              onChange={this.updateFieldData}
              disabled={editDisabled}
            />,
          ];
        } else if (columnName == "json") {
          if (item.data !== null) {
            colData = [
              <Popup
                key="rawjson"
                header="Raw JSON data"
                content={JSON.stringify(item.data)}
                position="top right"
                wide
                hoverable
                trigger={<Icon color="grey" name="ellipsis horizontal" />}
              />,
            ];
          }
        } else if (columnName === "aggregate_id") {
          colData = [
            <Input
              key={`aggregate_id|${item.name}`}
              name={`aggregate_id|${item.name}`}
              defaultValue={fields.aggregate_id}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />,
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
                  key={`bpdu_filter|${item.name}`}
                  name={`bpdu_filter|${item.name}`}
                  defaultChecked={fields.bpdu_filter}
                  onChange={this.updateFieldData}
                  disabled={editDisabled}
                />
              }
            />,
          ];
        } else if (columnName == "config") {
          colData = [
            <TextArea
              key={`config|${item.name}`}
              name={`config|${item.name}`}
              defaultValue={item.config}
              rows={3}
              cols={50}
              hidden={currentIfClass != "custom"}
              onChange={this.updateFieldData}
            />,
            <Popup
              on="click"
              pinned
              position="top right"
              trigger={
                <Button compact size="small">
                  <Icon name="arrow alternate circle down outline" />
                </Button>
              }
            >
              <p key="title">Current running config:</p>
              <InterfaceCurrentConfig
                hostname={this.hostname}
                interface={item.name}
              />
            </Popup>,
          ];
        }
        return (
          <Table.Cell collapsing key={columnName}>
            {colData}
          </Table.Cell>
        );
      });

      let statusIcon = <Icon loading color="grey" name="spinner" />;
      const { interfaceStatusData } = this.state;
      const interfaceStatusDataLower = Object.fromEntries(
        Object.entries(interfaceStatusData).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ]),
      );
      if (item.name.toLowerCase() in interfaceStatusDataLower) {
        const itemInterfaceStatusData =
          interfaceStatusDataLower[item.name.toLowerCase()];
        const toggleEnabled = (
          <Checkbox
            key={`enabled|${item.name}`}
            name={`enabled|${item.name}`}
            toggle
            label={<label>Enable interface</label>}
            defaultChecked={currentEnabled}
            onChange={this.updateFieldData}
            disabled={editDisabled}
          />
        );
        let bounceDisabled = false;
        let statusMessage = null;
        if (item.name in this.state.interfaceBounceRunning) {
          if (this.state.interfaceBounceRunning[item.name] === "running") {
            bounceDisabled = true;
          } else {
            statusMessage = (
              <p key="message">
                {this.state.interfaceBounceRunning[item.name]}
              </p>
            );
          }
        }

        const bounceInterfaceButton = this.device_type == "ACCESS" ? (
          <BounceInterfaceButton
            key={`${item.name}_bounce`}
            handleClick={() => this.submitBounce(item.name)}
            editDisabled={editDisabled}
            bounceDisabled={bounceDisabled} />
        ) : null;

        const graphiteHtml = (
          <GraphiteInterface
            key="graphite"
            hostname={this.hostname}
            interfaceName={item.name}
          />
        );

        if (itemInterfaceStatusData.is_up === true) {
          statusIcon = (
            <InterfaceStatusUp
              name={item.name}
              speed={itemInterfaceStatusData.speed}
              toggleEnabled={toggleEnabled}
              bounceInterfaceButton={bounceInterfaceButton}
              statusMessage={statusMessage}
              graphiteHtml={graphiteHtml}
            />
          );
        } else if (itemInterfaceStatusData.is_enabled === false) {
          statusIcon = (
            <InterfaceStatusAdminDisabled
              name={item.name}
              toggleEnabled={toggleEnabled}
              graphiteHtml={graphiteHtml}
            />
          );
        } else {
          statusIcon = (
            <InterfaceStatusDown
              name={item.name}
              toggleEnabled={toggleEnabled}
              bounceInterfaceButton={bounceInterfaceButton}
              statusMessage={statusMessage}
              graphiteHtml={graphiteHtml}
            />
          );
        }
      }

      const { netboxInterfaceData } = this.state;
      let netboxInterfacePopup = null;
      // if netboxInterfaceData is an array and not empty
      if (
        Array.isArray(netboxInterfaceData) &&
        netboxInterfaceData.length > 0
      ) {
        // find element in netboxInterfaceData with the same name as the interface item.name
        const currentNetboxInterfaceData = netboxInterfaceData.find(
          (netboxInterface) => netboxInterface.name === item.name,
        );
        if (currentNetboxInterfaceData) {
          netboxInterfacePopup = (
            <NetboxInterfacePopup
              netboxInterface={currentNetboxInterfaceData}
            />
          );
        }
      }

      const { lldpNeighborData } = this.state;
      let lldpNeighborPopup = null;
      // if netboxInterfaceData is an array and not empty
      // get key with name equal to item.name in lldpNeighborData object if it exists
      if (Object.hasOwn(lldpNeighborData, item.name.toLowerCase())) {
        lldpNeighborPopup = (
          <LldpNeighborPopup
            lldpNeighborData={lldpNeighborData[item.name.toLowerCase()]}
          />
        );
      }

      const descriptionDetails = (
        <div>
          <ButtonGroup key="toggle_tagged" size="mini" vertical>
            {netboxInterfacePopup}
            {lldpNeighborPopup}
          </ButtonGroup>
        </div>
      );

      return [
        <Table.Row key={`tr_${index}`} warning={updated}>
          <Table.Cell>
            {statusIcon} {item.name}
          </Table.Cell>
          <Table.Cell>
            <Input
              key={`description|${item.name}`}
              name={`description|${item.name}`}
              defaultValue={fields.description}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
            {descriptionDetails}
          </Table.Cell>
          {this.device_type == "ACCESS" && (
            <PortTypeCellAccess
              item={item}
              currentConfigtype={currentConfigtype}
              fields={fields}
              editDisabled={editDisabled}
              updateFieldData={this.updateFieldData}
            />
          )}
          {this.device_type == "DIST" && (
            <PortTypeCellDist
              item={item}
              currentIfClass={currentIfClass}
              portTemplate={portTemplate}
              editDisabled={editDisabled}
              portTemplateOptions={this.state.portTemplateOptions}
              updateFieldData={this.updateFieldData}
              addPortTemplateOption={this.addPortTemplateOption}
            />
          )}

          {optionalColumns}
        </Table.Row>,
      ];
    });
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
    const interfaceTable = this.renderTableRows(
      this.state.interfaceData,
      this.state.interfaceDataUpdated,
      this.state.vlanOptions,
    );
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
    const unusedInterfaces = Object.keys(interfaceStatusData).filter(
      (ifName) => {
        return !interfaceData.find(
          (obj) => obj.name.toLowerCase() === ifName.toLowerCase(),
        );
      },
    );

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
