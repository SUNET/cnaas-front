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
import { getData, getDataHeaders } from "../../utils/getData";
import InterfaceCurrentConfig from "./InterfaceCurrentConfig";
import { putData, postData } from "../../utils/sendData";
import GraphiteInterface from "./GraphiteInterface";

const io = require("socket.io-client");

let socket = null;

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
    portTemplateOptions: [],
    interfaceBounceRunning: {},
    mlagPeerHostname: null,
    interfaceToggleUntagged: {},
  };

  hostname = null;

  device_type = null;

  configTypeOptions = [
    { value: "ACCESS_AUTO", text: "Auto/dot1x" },
    { value: "ACCESS_UNTAGGED", text: "Untagged/access" },
    { value: "ACCESS_TAGGED", text: "Tagged/trunk" },
    { value: "ACCESS_DOWNLINK", text: "Downlink" },
    { value: "ACCESS_UPLINK", text: "Uplink", disabled: true },
    { value: "MLAG_PEER", text: "MLAG peer interface", disabled: true },
  ];

  ifClassOptions = [
    { value: "downlink", text: "Downlink" },
    { value: "fabric", text: "Fabric link" },
    { value: "custom", text: "Custom" },
    { value: "port_template", text: "Port template" },
  ];

  configTypesEnabled = [
    "ACCESS_AUTO",
    "ACCESS_UNTAGGED",
    "ACCESS_TAGGED",
    "ACCESS_DOWNLINK",
  ];

  ifClassesEnabled = ["custom", "downlink"]; // anything starting with port_template is also allowed

  columnWidths = {
    vlans: 4,
    tags: 3,
    json: 1,
    aggregate_id: 3,
    bpdu_filter: 1,
  };

  componentDidMount() {
    this.hostname = this.getDeviceName();
    if (this.hostname !== null) {
      this.getDeviceData().then(() => {
        this.getInterfaceData();
        this.getInterfaceStatusData();
      });
    }
    const credentials = localStorage.getItem("token");
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", function (data) {
      console.log("Websocket connected!");
      var ret = socket.emit("events", { update: "device" });
      var ret = socket.emit("events", { update: "job" });
    });
    socket.on("events", (data) => {
      // device update event
      if (
        data.device_id !== undefined &&
        data.device_id == this.state.deviceData.id &&
        data.action == "UPDATED"
      ) {
        console.log("DEBUG: ");
        console.log(this.state.deviceData);
        console.log(data.object);
        if (
          this.state.awaitingDeviceSynchronization === true &&
          data.object.synchronized === true
        ) {
          console.log("update data after job finish");
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

  getDeviceName() {
    const queryParams = queryString.parse(this.props.location.search);
    if (queryParams.hostname !== undefined) {
      return queryParams.hostname;
    }
    return null;
  }

  getInterfaceData() {
    const credentials = localStorage.getItem("token");
    if (this.device_type === "ACCESS") {
      const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;
      return getData(url, credentials)
        .then((data) => {
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

          data.data.interfaces.map((item, index) => {
            const ifData = item.data;
            if (ifData !== null && "neighbor_id" in ifData) {
              const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
              if (this.state.mlagPeerHostname == null) {
                getData(mlagDevURL, credentials)
                  .then((data) => {
                    this.setState({
                      mlagPeerHostname: data.data.devices[0].hostname,
                    });
                  })
                  .catch((error) => {
                    console.log(`MLAG peer not found: ${error}`);
                  });
              }
            }
          });
          this.setState({
            interfaceData: data.data.interfaces,
            tagOptions: usedTags,
          });
        })
        .catch((error) => {
          console.log(error);
        });
    }
    if (this.device_type === "DIST") {
      const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/generate_config`;
      return getDataHeaders(url, credentials, {
        "X-Fields": "available_variables{interfaces}",
      })
        .then((data) => {
          const { tagOptions } = this.state;
          const usedTags = tagOptions;
          const usedPortTemplates = [];
          data.data.config.available_variables.interfaces.forEach((item) => {
            if (usedTags.length === 0) {
              if (item.tags !== undefined && item.tags) {
                item.tags.forEach((tag) => {
                  if (usedTags.some((e) => e.text === tag)) {
                    return; // don't add duplicate tags
                  }
                  usedTags.push({ text: tag, value: tag });
                });
              }
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
            interfaceData: data.data.config.available_variables.interfaces,
            portTemplateOptions: usedPortTemplates,
            tagOptions: usedTags,
          });
        })
        .catch((error) => {
          console.log(error);
        });
    }
    console.error(`Unsupported device type: ${this.device_type}`);
  }

  getInterfaceStatusData() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interface_status`;
    return getData(url, credentials)
      .then((data) => {
        const interfaceStatus = {};
        // save interface status data keys as lowercase, in case yaml interface name is not correct case
        Object.keys(data.data.interface_status).forEach((key) => {
          interfaceStatus[key.toLowerCase()] = data.data.interface_status[key];
        });
        this.setState({
          interfaceStatusData: interfaceStatus,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  refreshInterfaceStatus() {
    this.setState({ interfaceStatusData: {} }, () => {
      this.getInterfaceStatusData();
    });
  }

  getDeviceData() {
    const credentials = localStorage.getItem("token");
    let url = `${process.env.API_URL}/api/v1.0/settings?hostname=${this.hostname}`;
    getData(url, credentials)
      .then((data) => {
        const vlanOptions = Object.entries(data.data.settings.vxlans).map(
          ([vxlan_name, vxlan_data]) => {
            return {
              value: vxlan_data.vlan_name,
              text: vxlan_data.vlan_name,
              description: vxlan_data.vlan_id,
            };
          },
        );
        const untaggedVlanOptions = [...vlanOptions];
        untaggedVlanOptions.push({
          value: null,
          text: "None",
          description: "NA",
        });
        // look for tag options
        let settingsTagOptions = [];
        if (
          data.data.settings.interface_tag_options !== undefined &&
          data.data.settings.interface_tag_options
        ) {
          settingsTagOptions = Object.entries(
            data.data.settings.interface_tag_options,
          ).map(([tag_name, tag_data]) => {
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
      })
      .catch((error) => {
        console.log(error);
      });
    url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}`;
    return getData(url, credentials)
      .then((data) => {
        const newState = {
          deviceData: data.data.devices[0],
          editDisabled: !data.data.devices[0].synchronized,
        };
        if (this.state.initialSyncState == null) {
          newState.initialSyncState = data.data.devices[0].synchronized;
          newState.initialConfHash = data.data.devices[0].confhash;
        }
        this.setState(newState);
        this.device_type = newState.deviceData.device_type;
      })
      .catch((error) => {
        console.log(error);
      });
  }

  prepareSendJson(interfaceData) {
    // what config keys go in to level, and what goes under ["data"]
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

  sendInterfaceData() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interfaces`;

    const sendData = this.prepareSendJson(this.state.interfaceDataUpdated);

    return putData(url, credentials, sendData)
      .then((data) => {
        console.log("put interface return data: ");
        console.log(data);

        if (data.status === "success") {
          return true;
        }
        this.setState({ errorMessage: data.message });
        return false;
      })
      .catch((error) => {
        this.setState({ errorMessage: error.message.errors.join(", ") });
        return false;
      });
  }

  startSynctoAutopush() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device_syncto`;

    const sendData = {
      dry_run: true,
      comment: "interface update via WebUI",
      hostname: this.hostname,
      auto_push: true,
    };

    postData(url, credentials, sendData).then((data) => {
      this.setState({
        autoPushJobs: [{ job_id: data.job_id, status: "RUNNING" }],
        working: true,
      });
    });
  }

  saveAndCommitChanges() {
    // save old state
    this.sendInterfaceData().then((saveStatus) => {
      if (saveStatus === true) {
        this.startSynctoAutopush();
        this.setState({ accordionActiveIndex: 3 });
      } else {
        this.setState({ accordionActiveIndex: 2 });
      }
    });
  }

  saveChanges() {
    this.sendInterfaceData().then((saveStatus) => {
      if (saveStatus === true) {
        this.props.history.push(
          `/config-change?hostname=${this.hostname}&scrollTo=dry_run&autoDryRun=true`,
        );
      } else {
        this.setState({ accordionActiveIndex: 2 });
      }
    });
  }

  gotoConfigChange() {
    this.props.history.push(
      `/config-change?hostname=${this.hostname}&scrollTo=refreshrepo`,
    );
  }

  addTagOption = (e, data) => {
    const { value } = data;
    this.setState((prevState) => ({
      tagOptions: [{ text: value, value }, ...prevState.tagOptions],
    }));
  };

  addPortTemplateOption = (e, data) => {
    const { value } = data;
    this.setState((prevState) => ({
      portTemplateOptions: [
        { text: value, value },
        ...prevState.portTemplateOptions,
      ],
    }));
  };

  updateFieldData = (e, data) => {
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
    if (json_key == "ifclass") {
      console.log(val);
      if (val != "port_template") {
        delete newData[interfaceName].port_template;
        console.log(newData);
      }
    }
    this.setState({
      interfaceDataUpdated: newData,
    });
  };

  submitBounce(intf) {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device/${this.hostname}/interface_status`;

    let interfaceBounceRunningNew = this.state.interfaceBounceRunning;
    interfaceBounceRunningNew[intf] = "running";
    this.setState({ interfaceBounceRunning: interfaceBounceRunningNew });

    const sendData = { bounce_interfaces: [intf] };
    putData(url, credentials, sendData)
      .then((data) => {
        interfaceBounceRunningNew = this.state.interfaceBounceRunning;
        if (data.status === "success") {
          interfaceBounceRunningNew[intf] = "finished";
        } else {
          interfaceBounceRunningNew[intf] = `error: ${data.data}`;
        }
        this.setState({ interfaceBounceRunning: interfaceBounceRunningNew });
      })
      .catch((error) => {
        interfaceBounceRunningNew = this.state.interfaceBounceRunning;
        interfaceBounceRunningNew[intf] = `error: ${error}`;
        this.setState({ interfaceBounceRunning: interfaceBounceRunningNew });
      });
  }

  untaggedClick = (event, data) => {
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

  renderTableRows(interfaceData, interfaceDataUpdated, vlanOptions) {
    return interfaceData.map((item, index) => {
      let ifData = item.data;
      let ifDataUpdated = null;
      let editDisabled = true;
      if (this.device_type === "ACCESS") {
        editDisabled = !this.configTypesEnabled.includes(item.configtype);
      } else if (this.device_type === "DIST") {
        if (item.ifclass.startsWith("port_template")) {
          editDisabled = false;
        } else {
          editDisabled = !this.ifClassesEnabled.includes(item.ifclass);
        }
      }
      let updated = false;
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
        ifData = {};
        fields = {
          description: "",
          untagged_vlan: null,
          tagged_vlan_list: [],
          tags: [],
          enabled: true,
          config: "",
        };
        Object.entries(fields).forEach(([key, value]) => {
          if (item[key] !== undefined && item[key] !== null) {
            ifData[key] = item[key];
          } else {
            ifData[key] = value;
          }
        });
        if ("peer_hostname" in item) {
          ifData.description = item.peer_hostname;
        }
      }
      if (item.name in interfaceDataUpdated) {
        updated = true;
        ifDataUpdated = interfaceDataUpdated[item.name];
      }
      if (ifData === undefined || ifData === null) {
        if (ifDataUpdated !== null) {
          const check_updated_fields = [
            "untagged_vlan",
            "tagged_vlan_list",
            "enabled",
            "tags",
            "aggregate_id",
            "bpdu_filter",
            "redundant_link",
          ];
          check_updated_fields.forEach((field_name) => {
            if (field_name in ifDataUpdated) {
              fields[field_name] = ifDataUpdated[field_name];
            }
          });
        }
      } else {
        if ("description" in ifData) {
          fields.description = ifData.description;
        } else if ("neighbor" in ifData) {
          fields.description = `Uplink to ${ifData.neighbor}`;
        } else if ("neighbor_id" in ifData) {
          fields.description = "MLAG peer link";
        }

        if ("tags" in ifData) {
          fields.tags = ifData.tags;
        }

        if ("bpdu_filter" in ifData) {
          fields.bpdu_filter = ifData.bpdu_filter;
        }

        if ("aggregate_id" in ifData) {
          fields.aggregate_id = ifData.aggregate_id;
        }

        if ("enabled" in ifData) {
          fields.enabled = ifData.enabled;
        }

        if ("redundant_link" in ifData) {
          fields.redundant_link = ifData.redundant_link;
        }

        if (ifDataUpdated !== null && "untagged_vlan" in ifDataUpdated) {
          fields.untagged_vlan = ifDataUpdated.untagged_vlan;
        } else if ("untagged_vlan" in ifData) {
          if (typeof ifData.untagged_vlan === "number") {
            const untagged_vlan_mapped = vlanOptions.filter(
              (vlanOptionItem) =>
                vlanOptionItem.description === ifData.untagged_vlan,
            );
            if (
              Array.isArray(untagged_vlan_mapped) &&
              untagged_vlan_mapped.length === 1
            ) {
              fields.untagged_vlan = untagged_vlan_mapped[0].value;
            } else {
              fields.untagged_vlan = null;
            }
          } else {
            fields.untagged_vlan = ifData.untagged_vlan;
          }
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
      }

      let currentConfigtype = null;
      let currentIfClass = null;
      let displayVlanTagged = false;
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
        displayVlanTagged = currentConfigtype === "ACCESS_TAGGED";
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
          displayVlanTagged = true;
          portTemplate = item.ifclass.substring("port_template_".length);
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
          } else if (
            currentConfigtype === "ACCESS_TAGGED" ||
            currentConfigtype === "ACCESS_UNTAGGED" ||
            (typeof currentIfClass === "string" &&
              currentIfClass.startsWith("port_template"))
          ) {
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
            if (
              currentConfigtype === "ACCESS_TAGGED" ||
              currentIfClass === "port_template"
            ) {
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
      if (item.name.toLowerCase() in interfaceStatusData) {
        const itemInterfaceStatusData =
          interfaceStatusData[item.name.toLowerCase()];

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
        const bounceButtonIcon = <Icon name="retweet" />;
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
        let bounceInterfaceButton = null;
        if (this.device_type == "ACCESS") {
          bounceInterfaceButton = (
            <Button
              key="bounce"
              disabled={editDisabled || bounceDisabled}
              loading={bounceDisabled}
              icon
              labelPosition="right"
              onClick={() => this.submitBounce(item.name)}
              size="small"
            >
              Bounce interface {bounceButtonIcon}
            </Button>
          );
        }
        let graphiteHtml = null;
        graphiteHtml = (
          <GraphiteInterface
            key="graphite"
            hostname={this.hostname}
            interfaceName={item.name}
          />
        );

        if (itemInterfaceStatusData.is_up === true) {
          statusIcon = (
            <Popup
              header={item.name}
              content={[
                <p key="status">
                  Interface is up, speed: {itemInterfaceStatusData.speed} Mbit/s
                </p>,
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
        } else if (itemInterfaceStatusData.is_enabled === false) {
          statusIcon = (
            <Popup
              header={item.name}
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
        } else {
          statusIcon = (
            <Popup
              header={item.name}
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
      }

      let portType = null;
      if (this.device_type == "ACCESS") {
        portType = (
          <Table.Cell>
            <Dropdown
              key={`configtype|${item.name}`}
              name={`configtype|${item.name}`}
              selection
              options={this.configTypeOptions}
              defaultValue={item.configtype}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
            {currentConfigtype === "ACCESS_DOWNLINK" ? (
              <Popup
                key="nonredundant"
                header="Redundant Link: true/false"
                content="Disable ZTP redundant link check for this downlink interface by unchecking this box"
                wide
                trigger={
                  <Checkbox
                    key={`redundant_link|${item.name}`}
                    name={`redundant_link|${item.name}`}
                    defaultChecked={fields.redundant_link}
                    onChange={this.updateFieldData}
                    disabled={editDisabled}
                  />
                }
              />
            ) : null}
          </Table.Cell>
        );
      } else if (this.device_type == "DIST") {
        portType = (
          <Table.Cell>
            <Dropdown
              key={`ifclass|${item.name}`}
              name={`ifclass|${item.name}`}
              selection
              options={this.ifClassOptions}
              defaultValue={currentIfClass}
              disabled={editDisabled}
              onChange={this.updateFieldData}
            />
            {currentIfClass == "port_template" ? (
              <Dropdown
                key={`port_template|${item.name}`}
                name={`port_template|${item.name}`}
                fluid
                selection
                search
                allowAdditions
                options={this.state.portTemplateOptions}
                defaultValue={portTemplate}
                disabled={editDisabled}
                onAddItem={this.addPortTemplateOption}
                onChange={this.updateFieldData}
              />
            ) : null}
          </Table.Cell>
        );
      }

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
          </Table.Cell>
          {portType}
          {optionalColumns}
        </Table.Row>,
      ];
    });
  }

  accordionClick = (e, titleProps) => {
    const { index } = titleProps;
    const { accordionActiveIndex } = this.state;
    const newIndex = accordionActiveIndex === index ? -1 : index;

    this.setState({ accordionActiveIndex: newIndex });
  };

  columnSelectorChange = (e, data) => {
    const newDisplayColumns = this.state.displayColumns;
    if (data.checked === true && newDisplayColumns.indexOf(data.name) === -1) {
      newDisplayColumns.push(data.name);
    } else if (data.checked === false) {
      const index = newDisplayColumns.indexOf(data.name);
      if (index > -1) {
        newDisplayColumns.splice(index, 1);
      }
    }
    this.setState({ displayColumns: newDisplayColumns });
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
      allowedColumns = {
        vlans: "VLANs",
        tags: "Tags",
        json: "Raw JSON",
        aggregate_id: "LACP aggregate ID",
        bpdu_filter: "BPDU filter",
      };
    } else if (this.device_type == "DIST") {
      allowedColumns = {
        vlans: "VLANs",
        tags: "Tags",
        config: "Custom config",
      };
    }

    const columnHeaders = this.state.displayColumns.map((columnName) => {
      return (
        <Table.HeaderCell
          width={this.columnWidths[columnName]}
          key={columnName}
        >
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
          <div className="table_options">
            <Popup
              on="click"
              pinned
              position="bottom right"
              trigger={
                <Button className="table_options_button">
                  <Icon name="table" />
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
