import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import queryString from "query-string";
import {
  Button,
  Checkbox,
  Icon,
  Loader,
  Modal,
  Popup,
  Table,
} from "semantic-ui-react";
import { getData, getDataHeaders, getDataToken } from "../../utils/getData";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { putData, postData } from "../../utils/sendData";
import { NetboxDevice } from "./NetboxDevice";
import { NewInterface } from "./NewInterface";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { CommitModalAccess, CommitModalDist } from "./CommitModal";
import { useFreshRef } from "../../hooks/useFreshRef";
import PropTypes from "prop-types";

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

InterfaceConfig.propTypes = {
  history: PropTypes.object,
  location: PropTypes.object,
};

export function InterfaceConfig({ history, location }) {
  const { token } = useAuthToken();

  // state
  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [autoPushJobs, setAutoPushJobs] = useState([]);
  const [deviceData, setDeviceData] = useState({});
  const [deviceSettings, setDeviceSettings] = useState(null);
  const [deviceType, setDeviceType] = useState(null);
  const [displayColumns, setDisplayColumns] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [initialConfHash, setInitialConfHash] = useState(null);
  const [initialSyncState, setInitialSyncState] = useState(null);
  const [interfaceBounceRunning, setInterfaceBounceRunning] = useState({});
  const [interfaceData, setInterfaceData] = useState([]);
  const [interfaceDataUpdated, setInterfaceDataUpdated] = useState({});
  const [interfaceStatusData, setInterfaceStatusData] = useState({});
  const [interfaceToggleUntagged, setInterfaceToggleUntagged] = useState({});
  const [lldpNeighborData, setLldpNeighborData] = useState({});
  const [mlagPeerHostname, setMlagPeerHostname] = useState(null);
  const [netboxDeviceData, setNetboxDeviceData] = useState({});
  const [netboxInterfaceData, setNetboxInterfaceData] = useState([]);
  const [portTemplateOptions, setPortTemplateOptions] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [thirdPartyUpdated, setThirdPartyUpdated] = useState(false);
  const [untaggedVlanOptions, setUntaggedVlanOptions] = useState([]);
  const [vlanOptions, setVlanOptions] = useState([]);
  const [working, setWorking] = useState(false);

  const autoPushJobsRef = useFreshRef(autoPushJobs);
  const awaitingDeviceSynchronizationRef = useRef(false);
  const hostname = useRef(queryString.parse(location.search)?.hostname ?? null);

  /**
   * On mount
   */
  useEffect(() => {
    if (hostname.current) {
      getDeviceData();
    }
  }, [hostname.current]);

  /**
   * On mount after device data
   */
  useEffect(() => {
    if (deviceType) {
      getInterfaceData();
      getInterfaceStatusData();
      getLldpNeighborData();
      getNetboxDeviceData(hostname.current);
      setDisplayColumnsFn();
    }
  }, [deviceType]);

  /**
   * Setup socket io.
   */
  useEffect(() => {
    socket = io(process.env.API_URL, { query: { jwt: token } });
    socket.on("connect", function () {
      console.log("Socket connected");
      socket.emit("events", { update: "device" });
      socket.emit("events", { update: "job" });
    });
    socket.on("error", (error) => {
      console.log("Socket error", error);
    });
    socket.on("disconnect", (reason, details) => {
      console.log("Socket disconnected", reason, details);
    });

    socket.on("events", (data) => {
      if (
        data.device_id &&
        data?.device_id === deviceData.id &&
        data.action === "UPDATED"
      ) {
        onDeviceUpdateEvent(data);
      } else if (data.job_id) {
        onJobUpdateEvent(data);
      }
    });

    return () => {
      if (socket) {
        socket.off("events");
      }
    };
  }, []);

  useEffect(() => {
    if (
      Object.keys(interfaceStatusData || {}).length === 0 &&
      Object.keys(lldpNeighborData || {}).length === 0
    ) {
      getInterfaceStatusData();
      getLldpNeighborData();
    }
  }, [interfaceStatusData, lldpNeighborData]);

  const onDeviceUpdateEvent = (data) => {
    console.debug("Device update event", data);

    const updatedDeviceData = data.object;
    setDeviceData(updatedDeviceData); // TODO: it makes not sense to update it here, then later again in trigger refresh

    if (
      awaitingDeviceSynchronizationRef.current &&
      updatedDeviceData.synchronized
    ) {
      // Synchronize done
      setInitialSyncState(null);
      setInitialConfHash(null);
      awaitingDeviceSynchronizationRef.current = false;

      getInterfaceData();
      getDeviceData(); // TODO: -> sets deviceData again
      refreshInterfaceStatus();
    }
  };

  const onJobUpdateEvent = (data) => {
    console.debug("Job update event", data);
    if (data.function_name === "refresh_repo" && !thirdPartyUpdated) {
      setThirdPartyUpdated(true);
    }

    if (
      autoPushJobsRef.current.length === 1 &&
      autoPushJobsRef.current[0].job_id === data.job_id
    ) {
      // if finished && next_job id, push next_job_id to array
      if (typeof data?.next_job_id === "number") {
        setAutoPushJobs([
          data,
          { job_id: data.next_job_id, status: "RUNNING" },
        ]);
      } else if (data.status === "FINISHED" || data.status === "EXCEPTION") {
        setErrorMessage([
          "Live run job not scheduled! There was an error or the change score was too high to continue with autopush.",
          " Check ",
          <Link key="jobs" to="/jobs">
            job log
          </Link>,
          " or do a ",
          <Link key="dryrun" to={`/config-change?hostname=${hostname.current}`}>
            dry run
          </Link>,
        ]);
        setWorking(false);
        setAutoPushJobs([data]);
        setAccordionActiveIndex(2);
      }
    } else if (
      autoPushJobsRef.current.length === 2 &&
      autoPushJobsRef.current[1].job_id === data.job_id
    ) {
      setAutoPushJobs((prev) => [prev[0], data]);
      if (data.status === "FINISHED" || data.status === "EXCEPTION") {
        console.log("Jobs finished");
        setWorking(false);
        setInterfaceDataUpdated({});
        awaitingDeviceSynchronizationRef.current = true;
      }
    }
  };

  const getDeviceData = async () => {
    const settingsUrl = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname.current}`;
    try {
      const data = await getData(settingsUrl, token);
      const vlanOptions = Object.entries(data.data.settings.vxlans).map(
        ([, vxlan_data]) => {
          return {
            value: vxlan_data.vlan_name,
            text: vxlan_data.vlan_name,
            description: vxlan_data.vlan_id,
          };
        },
      );

      const untaggedVlanOptions = [
        ...vlanOptions,
        {
          value: null,
          text: "None",
          description: "NA",
        },
      ];
      // look for tag options
      const interfaceTagOptions = data.data.settings.interface_tag_options;
      if (interfaceTagOptions) {
        const settingsTagOptions =
          Object.entries(interfaceTagOptions).map(([tag_name, tag_data]) => {
            return {
              text: tag_name,
              value: tag_name,
              description: tag_data.description,
            };
          }) ?? [];
        setTagOptions(settingsTagOptions);
      }

      setDeviceSettings(data.data.settings);
      setVlanOptions(vlanOptions);
      setUntaggedVlanOptions(untaggedVlanOptions);
    } catch (error) {
      console.log(error);
    }

    try {
      const deviceUrl = `${process.env.API_URL}/api/v1.0/device/${hostname.current}`;
      const fetchedDevice = await getData(deviceUrl, token);
      if (!initialSyncState) {
        setInitialSyncState(fetchedDevice.data.devices[0].synchronized);
        setInitialConfHash(fetchedDevice.data.devices[0].confhash);
      }
      setDeviceData(fetchedDevice.data.devices[0]);
      setDeviceType(fetchedDevice.data.devices[0].device_type);
    } catch (error) {
      console.log(error);
    }
  };

  const setDisplayColumnsFn = () => {
    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};
    let newDisplayColumns;
    if (deviceType === "ACCESS") {
      newDisplayColumns = interfaceConfig?.accessDisplayColumns;
    } else if (deviceType === "DIST") {
      newDisplayColumns = interfaceConfig?.distDisplayColumns;
    }

    // Make sure only valid columns are going to be visible
    setDisplayColumns(
      (newDisplayColumns ?? ["vlans"]).filter((column) =>
        VALID_COLUMNS.has(column),
      ),
    );
  };

  const getNetboxDeviceData = async (hostname) => {
    if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
      return null;
    }

    let credentials = localStorage.getItem("netboxToken");
    let getFunc = getDataToken;
    let url = process.env.NETBOX_API_URL;
    // fallback
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
        setNetboxDeviceData(deviceData);

        const netboxInterfacesUrl = `${url}/api/dcim/interfaces/?device_id=${deviceData.id}&limit=100`;
        const interfaceData = await getFunc(netboxInterfacesUrl, credentials);
        if (interfaceData) {
          setNetboxInterfaceData(interfaceData.results);
        }
      } else {
        console.log("No data found device", hostname);
      }
    } catch (e) {
      // Some netbox error occurred
      console.log(e);
    }
  };

  const getInterfaceData = async () => {
    if (deviceType === "ACCESS") {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interfaces`;
        const fetchedInterfaces = (await getData(url, token)).data.interfaces;
        const usedTags = tagOptions.slice();

        fetchedInterfaces.forEach((item) => {
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

        for (const item of fetchedInterfaces) {
          const ifData = item.data;
          if (ifData !== null && "neighbor_id" in ifData && !mlagPeerHostname) {
            try {
              const mlagDevURL = `${process.env.API_URL}/api/v1.0/device/${ifData.neighbor_id}`;
              const mlagData = await getData(mlagDevURL, token);
              setMlagPeerHostname(mlagData.data.devices[0].hostname);
              break;
            } catch (error) {
              console.log(`MLAG peer not found: ${error}`);
            }
          }
        }

        setInterfaceData(fetchedInterfaces);
        setTagOptions(usedTags);
      } catch (error) {
        console.log(error);
      }
    } else if (deviceType === "DIST") {
      try {
        const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/generate_config`;
        const data = await getDataHeaders(url, token, {
          "X-Fields": "available_variables{interfaces,port_template_options}",
        });
        const fetchedAvailaleVariables = data.data.config.available_variables;
        let usedPortTemplates = [];
        const availablePortTemplateOptions =
          fetchedAvailaleVariables.port_template_options;
        if (availablePortTemplateOptions) {
          usedPortTemplates = Object.entries(availablePortTemplateOptions).map(
            ([template_name, template_data]) => {
              return {
                text: template_name,
                value: template_name,
                description: template_data.description,
                vlan_config: template_data.vlan_config,
              };
            },
          );
        }

        const usedTags = tagOptions.slice();
        const availableInterfaces = fetchedAvailaleVariables.interfaces;
        availableInterfaces.forEach((item) => {
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

        setInterfaceData(availableInterfaces);
        setPortTemplateOptions(usedPortTemplates);
        setTagOptions(usedTags);
      } catch (error) {
        console.log(error);
      }
    }

    if (deviceType && deviceType !== "ACCESS" && deviceType !== "DIST") {
      console.error(`Unsupported device type: ${deviceType}`);
    }
  };

  const getInterfaceStatusData = async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interface_status`;
      const data = await getData(url, token);
      const interfaceStatus = data.data.interface_status;
      setInterfaceStatusData(interfaceStatus);
    } catch (error) {
      console.log(error);
    }
  };

  const getLldpNeighborData = async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/lldp_neighbors_detail`;
      const data = await getData(url, token);
      const fetchedLldpNeighsDetail = data.data.lldp_neighbors_detail;
      const lldpNeighbors = {};
      // save interface status data keys as lowercase, in case yaml interface name is not correct case
      Object.keys(fetchedLldpNeighsDetail ?? []).forEach((key) => {
        lldpNeighbors[key.toLowerCase()] = fetchedLldpNeighsDetail[key];
      });
      setLldpNeighborData(lldpNeighbors);
    } catch (error) {
      console.log(error);
    }
  };

  const refreshInterfaceStatus = () => {
    setInterfaceStatusData({});
    setLldpNeighborData({});
    getInterfaceStatusData();
    getLldpNeighborData();
  };

  const prepareSendJson = () => {
    // build object in the format API expects interfaces{} -> name{} -> configtype,data{}
    const sendData = { interfaces: {} };

    Object.entries(interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const topLevelKeys = {};
        const dataLevelKeys = {};

        Object.entries(formData).forEach(([formKey, formValue]) => {
          if (formKey === "configtype") {
            topLevelKeys[formKey] = formValue;
          } else {
            dataLevelKeys[formKey] = formValue;
          }
        });

        if (Object.keys(dataLevelKeys).length >= 1) {
          topLevelKeys.data = dataLevelKeys;
        }

        sendData.interfaces[interfaceName] = topLevelKeys;
      },
    );

    return sendData;
  };

  const prepareYaml = () => {
    const sendData = { interfaces: [] };

    Object.entries(interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const ifData = { name: interfaceName };

        // Copy previous values from state
        const prevIntf = interfaceData.find(
          (intf) => intf.name === interfaceName,
        );

        if (prevIntf) {
          Object.entries(prevIntf).forEach(([prevKey, prevValue]) => {
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

        let skipIfClass = false;
        Object.entries(formData).forEach(([formKey, formValue]) => {
          // port_template is not a separate value in the result yaml, but a suffix on ifclass
          if (formKey === "port_template") {
            if (
              formData.ifclass === "port_template" ||
              !("ifclass" in formData)
            ) {
              ifData.ifclass = `port_template_${formValue}`;
              skipIfClass = true;
            }
          } else if (formKey === "ifclass" && !skipIfClass) {
            ifData.ifclass = formData.ifclass;
          } else {
            ifData[formKey] = formValue;
          }
        });

        sendData.interfaces.push(ifData);
      },
    );

    return sendData;
  };

  const sendInterfaceData = async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interfaces`;
      const sendData = prepareSendJson();
      const data = await putData(url, token, sendData);

      if (data.status === "success") {
        return true;
      } else {
        setErrorMessage(data.message); // TODO: why is there an error message here?
      }
    } catch (error) {
      console.log(error);
      setErrorMessage(error?.message?.errors?.join(", "));
    }

    return false;
  };

  const startSynctoAutopush = async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device_syncto`;
      const sendData = {
        dry_run: true,
        comment: "interface update via WebUI",
        hostname: hostname.current,
        auto_push: true,
      };
      const data = await postData(url, token, sendData);

      setAutoPushJobs([{ job_id: data.job_id, status: "RUNNING" }]);
      setWorking(true);
    } catch (error) {
      console.log(error);
    }
  };

  const saveAndCommitChanges = async () => {
    const saveStatus = await sendInterfaceData();
    if (saveStatus) {
      startSynctoAutopush();
    }
    setAccordionActiveIndex(saveStatus ? 3 : 2);
  };

  const saveChanges = async () => {
    const saveStatus = await sendInterfaceData();
    if (saveStatus) {
      history.push(
        `/config-change?hostname=${hostname.current}&scrollTo=dry_run&autoDryRun=true`,
      );
    } else {
      setAccordionActiveIndex(2);
    }
  };

  const gotoConfigChange = () => {
    history.push(
      `/config-change?hostname=${hostname.current}&scrollTo=refreshrepo`,
    );
  };

  const addNewInterface = (interfaceName) => {
    setInterfaceData((prev) => [
      ...prev,
      { name: interfaceName, ifclass: "custom", tags: null },
    ]);
  };

  const addTagOption = (_e, data) => {
    const { value } = data;

    setTagOptions((prev) => [...prev, { text: value, value }]);
  };

  const addPortTemplateOption = (_e, data) => {
    const { value } = data;

    setPortTemplateOptions((prev) => [...prev, { text: value, value }]);
  };

  const updateFieldData = (_e, data) => {
    const nameSplit = data.name.split("|", 2);
    const interfaceName = nameSplit[1];
    const jsonKey = nameSplit[0];
    const defaultValue =
      "defaultChecked" in data ? data.defaultChecked : data.defaultValue;
    let val = "defaultChecked" in data ? data.checked : data.value;

    if (
      deviceType === "DIST" &&
      ["untagged_vlan", "tagged_vlan_list"].includes(jsonKey)
    ) {
      // Get VLAN ID instead of name by looking in the description field of the options
      if (Array.isArray(data.value)) {
        val = data.value.map((opt) => {
          const found = data.options.find((e) => e.value === opt);
          return found ? found.description : null;
        });
      } else {
        const found = data.options.find((e) => e.value === data.value);
        val = found ? found.description : null;
      }
    }

    if (["aggregate_id"].includes(jsonKey)) {
      val = parseInt(val, 10);
      if (isNaN(val)) {
        val = null;
      }
    }

    setInterfaceDataUpdated((prev) => {
      const newData = { ...prev };

      if (JSON.stringify(val) !== JSON.stringify(defaultValue)) {
        newData[interfaceName] = { ...newData[interfaceName], [jsonKey]: val };
      } else if (newData[interfaceName]?.[jsonKey] !== undefined) {
        const rest = { ...newData[interfaceName] };
        delete rest[jsonKey];
        if (Object.keys(rest).length === 0) {
          delete newData[interfaceName];
        } else {
          newData[interfaceName] = rest;
        }
      }

      if (jsonKey === "ifclass" && val !== "port_template") {
        delete newData[interfaceName].port_template;
      }

      return newData;
    });
  };

  const submitBounce = async (intf) => {
    setInterfaceBounceRunning((prev) => ({
      ...prev,
      [intf]: "running",
    }));

    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interface_status`;
      const sendData = { bounce_interfaces: [intf] };
      const data = await putData(url, token, sendData);
      const success = data.status === "success";

      setInterfaceBounceRunning((prev) => ({
        ...prev,
        [intf]: success ? "finished" : `error: ${data.data}`,
      }));
    } catch (error) {
      console.log(error);

      setInterfaceBounceRunning((prev) => ({
        ...prev,
        [intf]: `error: ${error}`,
      }));
    }
  };

  const untaggedClick = (_e, data) => {
    setInterfaceToggleUntagged((prev) => {
      const newState = { ...prev };

      if (data.name === "untagged") {
        newState[data.id] = true;
      } else {
        delete newState[data.id];
      }

      return newState;
    });
  };

  const accordionClick = (_e, titleProps) => {
    const { index } = titleProps;
    setAccordionActiveIndex((prev) => (prev === index ? -1 : index));
  };

  const columnSelectorChange = (_e, data) => {
    let columnOrder;
    if (deviceType === "ACCESS") {
      columnOrder = Object.keys(ALLOWED_COLUMNS_ACCESS);
    } else if (deviceType === "DIST") {
      columnOrder = Object.keys(ALLOWED_COLUMNS_DIST);
    }

    const newDisplayColumns = [...displayColumns];

    if (data.checked && !newDisplayColumns.includes(data.name)) {
      newDisplayColumns.push(data.name);
    } else if (!data.checked) {
      const index = newDisplayColumns.indexOf(data.name);
      if (index > -1) {
        newDisplayColumns.splice(index, 1);
      }
    }

    // Sort columns by their position in the predefined order
    newDisplayColumns.sort(
      (a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b),
    );

    setDisplayColumns(newDisplayColumns);

    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};

    if (deviceType === "ACCESS") {
      interfaceConfig.accessDisplayColumns = newDisplayColumns;
    } else if (deviceType === "DIST") {
      interfaceConfig.distDisplayColumns = newDisplayColumns;
    }

    localStorage.setItem("interfaceConfig", JSON.stringify(interfaceConfig));
  };

  const interfaceTable = interfaceData.map((item, index) => (
    <InterfaceTableRow
      key={item.name}
      item={item}
      index={index}
      deviceType={deviceType}
      interfaceDataUpdated={interfaceDataUpdated}
      vlanOptions={vlanOptions}
      untaggedVlanOptions={untaggedVlanOptions}
      displayColumns={displayColumns}
      deviceSettings={deviceSettings}
      tagOptions={tagOptions}
      portTemplateOptions={portTemplateOptions}
      interfaceStatusData={interfaceStatusData}
      interfaceBounceRunning={interfaceBounceRunning}
      netboxInterfaceData={netboxInterfaceData}
      lldpNeighborData={lldpNeighborData}
      hostname={hostname.current}
      updateFieldData={updateFieldData}
      addTagOption={addTagOption}
      addPortTemplateOption={addPortTemplateOption}
      submitBounce={() => submitBounce(item.name)}
      untaggedClick={untaggedClick}
      interfaceToggleUntagged={interfaceToggleUntagged}
    />
  ));

  const commitAutopushDisabled =
    working || !initialSyncState || initialConfHash !== deviceData.confhash;

  let stateWarning = null;
  if (initialSyncState === null) {
    stateWarning = <Loader active />;
  } else if (!initialSyncState || initialConfHash !== deviceData.confhash) {
    stateWarning = (
      <p>
        <Icon name="warning sign" color="orange" size="large" />
        Device is not synchronized, use dry_run and verify diff to apply
        changes.
      </p>
    );
  }

  const allowedColumns =
    deviceType === "ACCESS"
      ? ALLOWED_COLUMNS_ACCESS
      : deviceType === "DIST"
        ? ALLOWED_COLUMNS_DIST
        : {};

  const columnWidths = {
    vlans: 4,
    tags: 3,
    json: 1,
    aggregate_id: 3,
    bpdu_filter: 1,
  };

  const columnHeaders = displayColumns.map((columnName) => (
    <Table.HeaderCell width={columnWidths[columnName]} key={columnName}>
      {allowedColumns[columnName]}
    </Table.HeaderCell>
  ));

  const columnSelectors = Object.keys(allowedColumns).map(
    (columnName, columnIndex) => {
      const checked = displayColumns.includes(columnName);

      // if value has been changed for an optional column, don't allow
      // hiding that column since the defaultValue will be wrong if re-adding it later
      const disabled = Object.values(interfaceDataUpdated).some((ifData) =>
        Object.keys(ifData).includes(columnName),
      );

      return (
        <li key={columnIndex}>
          <Checkbox
            defaultChecked={checked}
            disabled={disabled}
            label={allowedColumns[columnName]}
            name={columnName}
            onChange={columnSelectorChange}
          />
        </li>
      );
    },
  );

  const autoPushJobsHTML = useCallback(
    autoPushJobs.map((job, index) => {
      let jobIcon = null;
      if (job.status === "RUNNING") {
        jobIcon = <Icon loading name="cog" color="grey" />;
      } else if (job.status === "FINISHED") {
        jobIcon = <Icon name="check" color="green" />;
      } else {
        jobIcon = <Icon name="delete" color="red" />;
      }

      const label = index === 0 ? "Dry run" : "Live run";
      return (
        <li key={index}>
          {label} (job ID {job.job_id}) status: {job.status} {jobIcon}
        </li>
      );
    }),
    [autoPushJobs],
  );

  const mlagPeerInfo = mlagPeerHostname && (
    <p>
      MLAG peer hostname:{" "}
      <a href={`/interface-config?hostname=${mlagPeerHostname}`}>
        {mlagPeerHostname}
      </a>
    </p>
  );

  const netboxInfo = netboxDeviceData && (
    <NetboxDevice netboxDevice={netboxDeviceData} />
  );

  let commitModal = null;
  if (deviceType === "ACCESS") {
    commitModal = (
      <CommitModalAccess
        accordionActiveIndex={accordionActiveIndex}
        accordionClick={accordionClick}
        autoPushJobsHTML={autoPushJobsHTML}
        errorMessage={errorMessage}
        interfaceDataUpdatedJSON={prepareSendJson()}
      />
    );
  } else if (deviceType === "DIST") {
    commitModal = (
      <CommitModalDist
        hostname={hostname.current}
        interfaceDataUpdated={interfaceDataUpdated}
        ifDataYaml={prepareYaml()}
      />
    );
  }

  // find unused interfaces
  const unusedInterfaces = interfaceStatusData
    ? Object.keys(interfaceStatusData).filter(
        (ifName) =>
          !interfaceData.find(
            (obj) => obj.name.toLowerCase() === ifName.toLowerCase(),
          ),
      )
    : [];

  return (
    <section>
      <div id="device_list">
        <h2>Interface configuration</h2>
        <p>
          Hostname:{" "}
          <a href={`/devices?search_hostname=${hostname.current}`}>
            {hostname.current}
          </a>
          , sync state:{" "}
          {deviceData.synchronized ? (
            <Icon name="check" color="green" />
          ) : (
            <Icon name="delete" color="red" />
          )}
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
                  {deviceType === "DIST" ? "Interface class" : "Configtype"}
                </Table.HeaderCell>
                {columnHeaders}
              </Table.Row>
            </Table.Header>
            <Table.Body>{interfaceTable}</Table.Body>
            <Table.Footer fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan={3 + displayColumns.length}>
                  <Modal
                    onClose={() => setSaveModalOpen(false)}
                    onOpen={() => setSaveModalOpen(true)}
                    open={saveModalOpen}
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
                        onClick={() => {
                          setSaveModalOpen(false);
                          setAutoPushJobs([]);
                          setErrorMessage(null);
                          setAccordionActiveIndex(0);
                        }}
                      >
                        Close
                      </Button>
                      {deviceType === "ACCESS" && [
                        <Button
                          key="submit"
                          onClick={saveAndCommitChanges}
                          disabled={commitAutopushDisabled}
                          color="yellow"
                        >
                          Save and commit now
                        </Button>,
                        <Button
                          key="dryrun"
                          onClick={saveChanges}
                          disabled={working}
                          positive
                        >
                          Save and dry run...
                        </Button>,
                      ]}
                      {deviceType === "DIST" && (
                        <Button
                          key="dryrun"
                          onClick={gotoConfigChange}
                          positive
                        >
                          Start dry run...
                        </Button>
                      )}
                    </Modal.Actions>
                  </Modal>
                  <Button
                    icon
                    labelPosition="right"
                    onClick={refreshInterfaceStatus}
                  >
                    Refresh interface status
                    <Icon name="refresh" />
                  </Button>
                  {deviceType === "DIST" && [
                    <NewInterface
                      suggestedInterfaces={unusedInterfaces}
                      addNewInterface={addNewInterface}
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
