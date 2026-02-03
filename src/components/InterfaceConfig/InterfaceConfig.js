import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import queryString from "query-string";
import { Button, Checkbox, Icon, Modal, Popup, Table } from "semantic-ui-react";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import io from "socket.io-client";
import { getData, getDataHeaders, getDataToken } from "../../utils/getData";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { putData, postData } from "../../utils/sendData";
import { NetboxDevice } from "./NetboxDevice";
import { NewInterface } from "./NewInterface";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { CommitModalAccess, CommitModalDist } from "./CommitModal";
import { ImportInterfaceModal } from "./ImportInterfaceModal";
import PropTypes from "prop-types";
let socket = null;

const STATUS_STOPPED = ["FINISHED", "EXCEPTION"]; // TODO: add "ABORTED"?

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

const ALLOWED_COLUMNS_MAP = {
  ACCESS: ALLOWED_COLUMNS_ACCESS,
  DIST: ALLOWED_COLUMNS_DIST,
};

const VALID_COLUMNS = new Set([
  ...Object.keys(ALLOWED_COLUMNS_ACCESS),
  ...Object.keys(ALLOWED_COLUMNS_DIST),
]);

const showSynchronizedChangedToast = (sync) => {
  toast({
    type: "warning",
    icon: "paper plane",
    title: `Synchronized state was changed!`,
    animation: "bounce",
    description: <p>Device state was changed to {sync} by a third party.</p>,
    time: 0,
  });
};

const showOutOfSyncToast = (handleClick) => {
  toast({
    type: "warning",
    icon: "paper plane",
    title: `Device was updated elsewhere!`,
    description: (
      <p>
        Device has been updated by a third party, this page is out of sync.
        <br />
        <Button onClick={handleClick}>Refresh</Button>
      </p>
    ),
    animation: "bounce",
    time: 0,
  });
};

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
  const [displayColumns, setDisplayColumns] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [interfaceBounceRunning, setInterfaceBounceRunning] = useState({});
  const [interfaceData, setInterfaceData] = useState([]);
  const [interfaceDataUpdated, setInterfaceDataUpdated] = useState({});
  const [interfaceStatusData, setInterfaceStatusData] = useState({});
  const [interfaceToggleUntagged, setInterfaceToggleUntagged] = useState({});
  const [isDeviceSynchronized, setIsDeviceSynchronized] = useState(
    deviceData.synchronized,
  );
  const [isWorking, setIsWorking] = useState(false);
  const [lldpNeighborData, setLldpNeighborData] = useState({});
  const [mlagPeerHostname, setMlagPeerHostname] = useState(null);
  const [netboxDeviceData, setNetboxDeviceData] = useState({});
  const [netboxInterfaceData, setNetboxInterfaceData] = useState([]);
  const [portTemplateOptions, setPortTemplateOptions] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [thirdPartyUpdate, setThirdPartyUpdate] = useState(false);
  const [untaggedVlanOptions, setUntaggedVlanOptions] = useState([]);
  const [vlanOptions, setVlanOptions] = useState([]);

  const awaitingDeviceSynchronizationRef = useRef(false);
  const hostname = useRef(queryString.parse(location.search)?.hostname ?? null);

  const deviceType = deviceData?.device_type ?? null;

  /**
   * On mount
   */
  useEffect(() => {
    if (!hostname.current) return;

    const fetchData = async () => {
      await getDeviceSettings();
      await getDeviceData();
    };

    fetchData();
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
      handleSocketEventRef.current?.(data);
    });

    return () => {
      if (socket) {
        socket.off("events");
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  // handleSocketEventRef is used and updated every render to avoid stale closure
  const handleSocketEventRef = useRef();

  useEffect(() => {
    handleSocketEventRef.current = (data) => {
      if (
        data.device_id &&
        data?.device_id === deviceData.id &&
        data.action === "UPDATED"
      ) {
        onDeviceUpdateEvent(data);
      } else if (data?.job_id) {
        onJobUpdateEvent(data);
      }
    };
  });

  /**
   *  update event with this device's id
   */
  const onDeviceUpdateEvent = (data) => {
    console.debug("Device update event", data);

    const updatedDeviceData = data.object;

    if (
      awaitingDeviceSynchronizationRef.current &&
      updatedDeviceData.synchronized
    ) {
      // Synchronize done
      awaitingDeviceSynchronizationRef.current = false;
      getInterfaceData();
      getDeviceSettings();
      getDeviceData();
      refreshInterfaceStatus();
      setThirdPartyUpdate(false);
    } else {
      setIsDeviceSynchronized(updatedDeviceData.synchronized);
      if (
        !isWorking &&
        isDeviceSynchronized !== updatedDeviceData.synchronized
      ) {
        showSynchronizedChangedToast(updatedDeviceData.synchronized);
      }
      if (!isWorking && updatedDeviceData.confhash !== deviceData.confhash) {
        setThirdPartyUpdate(true);
        showOutOfSyncToast(reloadDeviceData);
      }
    }
  };

  const onJobUpdateEvent = (data) => {
    console.debug("Job update event", data);

    if (autoPushJobs.length === 1 && autoPushJobs[0].job_id === data.job_id) {
      // if finished && next_job id, push next_job_id to array
      if (typeof data?.next_job_id === "number") {
        setAutoPushJobs([
          data,
          { job_id: data.next_job_id, status: "RUNNING" },
        ]);
      } else if (STATUS_STOPPED.includes(data.status)) {
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
        setIsWorking(false);
        setAutoPushJobs([data]);
        setAccordionActiveIndex(2);
      }
    } else if (
      autoPushJobs.length === 2 &&
      autoPushJobs[1].job_id === data.job_id
    ) {
      setAutoPushJobs((prev) => [prev[0], data]);
      if (STATUS_STOPPED.includes(data.status)) {
        console.log("Jobs finished");
        setIsWorking(false);
        setInterfaceDataUpdated({});
        // After Dry Run is done, listen for sync events
        awaitingDeviceSynchronizationRef.current = true;
      }
    }
  };

  // --- External Data ---
  const getDeviceSettings = useCallback(async () => {
    const settingsUrl = `${process.env.API_URL}/api/v1.0/settings?hostname=${hostname.current}`;
    try {
      const dataSettings = (await getData(settingsUrl, token)).data.settings;
      setDeviceSettings(dataSettings);

      const vlanOptions = Object.entries(dataSettings.vxlans).map(
        ([, vxlanData]) => {
          return {
            key: vxlanData.vni,
            value: vxlanData.vlan_name,
            text: vxlanData.vlan_name,
            description: vxlanData.vlan_id,
          };
        },
      );
      setVlanOptions(vlanOptions);

      const untaggedVlanOptions = [
        ...vlanOptions,
        {
          value: null,
          text: "None",
          description: "NA",
        },
      ];
      setUntaggedVlanOptions(untaggedVlanOptions);

      // look for tag options
      const interfaceTagOptions = dataSettings.interface_tag_options;
      if (interfaceTagOptions) {
        const settingsTagOptions =
          Object.entries(interfaceTagOptions).map(([tagName, tagData]) => {
            return {
              text: tagName,
              value: tagName,
              description: tagData.description,
            };
          }) ?? [];
        setTagOptions(settingsTagOptions);
      }
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  const getDeviceData = useCallback(async () => {
    try {
      const deviceUrl = `${process.env.API_URL}/api/v1.0/device/${hostname.current}`;
      const fetchedDevice = (await getData(deviceUrl, token)).data.devices[0];
      setDeviceData(fetchedDevice);
      setIsDeviceSynchronized(fetchedDevice.synchronized);
      setThirdPartyUpdate(false);
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  const getNetboxDeviceData = useCallback(async (hostname) => {
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
  }, []);

  const getInterfaceStatusData = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interface_status`;
      const data = await getData(url, token);
      const interfaceStatus = data.data.interface_status;
      setInterfaceStatusData(interfaceStatus);
    } catch (error) {
      console.log(error);
      setInterfaceStatusData({});
    }
  }, [token]);

  const getLldpNeighborData = useCallback(async () => {
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
      setLldpNeighborData({});
    }
  }, [token]);

  const getInterfaceDataAccess = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/interfaces`;
      const fetchedInterfaces = (await getData(url, token)).data.interfaces;
      setInterfaceData(fetchedInterfaces);

      setTagOptions((prev) => {
        const usedTags = prev.slice();
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

        return usedTags;
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
    } catch (error) {
      console.log(error);
    }
  }, [token, mlagPeerHostname]);

  const getInterfaceDataDist = useCallback(async () => {
    try {
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname.current}/generate_config`;
      const data = await getDataHeaders(url, token, {
        "X-Fields": "available_variables{interfaces,port_template_options}",
      });
      const fetchedAvailableVariables = data.data.config.available_variables;

      const availablePortTemplateOptions =
        fetchedAvailableVariables.port_template_options;
      const usedPortTemplates = Object.entries(
        availablePortTemplateOptions ?? {},
      ).map(([templateName, templateData]) => {
        return {
          text: templateName,
          value: templateName,
          description: templateData.description,
          vlan_config: templateData.vlan_config,
        };
      });

      const availableInterfaces = fetchedAvailableVariables.interfaces;
      setInterfaceData(availableInterfaces);

      const allPortTemplates = [...usedPortTemplates];
      availableInterfaces.forEach((item) => {
        if (item.ifclass.startsWith("port_template")) {
          const templateName = item.ifclass.substring("port_template_".length);
          if (!allPortTemplates.some((e) => e.text === templateName)) {
            allPortTemplates.push({
              text: templateName,
              value: templateName,
            });
          }
        }
      });
      setPortTemplateOptions(allPortTemplates);

      setTagOptions((prev) => {
        const usedTags = prev.slice();

        availableInterfaces.forEach((item) => {
          if (usedTags.length === 0 && item.tags) {
            item.tags.forEach((tag) => {
              if (!usedTags.some((e) => e.text === tag)) {
                usedTags.push({ text: tag, value: tag });
              }
            });
          }
        });

        return usedTags;
      });
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  const getInterfaceData = useCallback(async () => {
    if (deviceType === "ACCESS") {
      await getInterfaceDataAccess();
    } else if (deviceType === "DIST") {
      await getInterfaceDataDist();
    }

    if (deviceType && deviceType !== "ACCESS" && deviceType !== "DIST") {
      console.error(`Unsupported device type: ${deviceType}`);
    }
  }, [deviceType, getInterfaceDataAccess, getInterfaceDataDist]);

  // --- end external data ---

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

  const refreshInterfaceStatus = useCallback(() => {
    getInterfaceStatusData();
    getLldpNeighborData();
  }, [getInterfaceStatusData, getLldpNeighborData]);

  const reloadDeviceData = useCallback(() => {
    document
      .querySelectorAll(".ui.floating.message")
      .forEach((el) => el.remove());

    setInterfaceDataUpdated({});
    setThirdPartyUpdate(false);
    getDeviceSettings();
    getDeviceData();
    getInterfaceData();
    getInterfaceStatusData();
    getLldpNeighborData();
  }, [
    getDeviceSettings,
    getDeviceData,
    getInterfaceData,
    getInterfaceStatusData,
    getLldpNeighborData,
  ]);

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
        console.log(data.message);
        setErrorMessage(data.message);
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
    } catch (error) {
      console.log(error);
    }
  };

  const saveAndCommitChanges = async () => {
    setIsWorking(true);
    const saveStatus = await sendInterfaceData();
    if (saveStatus) {
      startSynctoAutopush();
    }
    setAccordionActiveIndex(saveStatus ? 3 : 2);
  };

  const saveChanges = async () => {
    setIsWorking(true);
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

  const exportInterfaceConfig = async (hostname) => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces_export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${hostname}_interfaces.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
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
    isWorking || thirdPartyUpdate || !isDeviceSynchronized;

  const allowedColumns = ALLOWED_COLUMNS_MAP[deviceType] || {};

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

  let tableLevelButtons = [];
  if (deviceType === "ACCESS") {
    tableLevelButtons = [
      <Popup
        on="hover"
        position="bottom right"
        key="export_interface_config"
        trigger={
          <Button
            className="table_options_button"
            icon
            basic
            size="small"
            title="Export interface configuration"
            onClick={() => {
              exportInterfaceConfig(hostname.current);
            }}
          >
            <Icon name="share square" />
          </Button>
        }
      >
        Export interface configuration as downloadable JSON file
      </Popup>,
      <Popup
        on="hover"
        position="bottom right"
        key="import_interface_config"
        trigger={
          <Button
            className="table_options_button"
            icon
            basic
            size="small"
            title="Import interface configuration"
            onClick={() => {
              setImportModalOpen(true);
            }}
          >
            <Icon name="add square" />
          </Button>
        }
      >
        Import interface configuration from a JSON file
      </Popup>,
    ];
  }

  return (
    <section>
      <SemanticToastContainer position="top-right" maxToasts={1} />
      <div id="device_list">
        <h2>Interface configuration</h2>
        <p>
          Hostname:{" "}
          <a href={`/devices?search_hostname=${hostname.current}`}>
            {hostname.current}
          </a>
          , sync state:{" "}
          {isDeviceSynchronized ? (
            <Icon name="check" color="green" />
          ) : (
            <Icon name="delete" color="red" />
          )}
        </p>
        {mlagPeerInfo}
        {!isDeviceSynchronized && (
          <p>
            <Icon name="warning sign" color="orange" size="large" />
            Device is not synchronized, use dry_run and verify diff to apply
            changes.
          </p>
        )}
        {thirdPartyUpdate && (
          <p>
            <Icon name="warning sign" color="orange" size="large" />
            Device has been updated by a third party. Reload page to get the
            latest changes (local changes will be lost).{" "}
            <Button size="mini" onClick={reloadDeviceData}>
              Refresh Data
            </Button>
          </p>
        )}
        {netboxInfo}
        <div className="table_options">
          <Popup
            on="click"
            key="select_columns"
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
          {tableLevelButtons}
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
                          key="access_button_saveandcommit"
                          onClick={saveAndCommitChanges}
                          disabled={commitAutopushDisabled}
                          color="yellow"
                        >
                          Save and commit now
                        </Button>,
                        <Button
                          key="access_button_dryrun"
                          onClick={saveChanges}
                          disabled={isWorking}
                          positive
                        >
                          Save and dry run...
                        </Button>,
                      ]}
                      {deviceType === "DIST" && (
                        <Button
                          key="dist_button_dryrun"
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
          <ImportInterfaceModal
            open={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            hostname={hostname.current}
            getInterfaceData={getInterfaceData}
            history={history}
          />
        </div>
      </div>
    </section>
  );
}
