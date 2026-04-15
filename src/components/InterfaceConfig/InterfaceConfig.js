import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Checkbox, Icon, Modal, Popup, Table } from "semantic-ui-react";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import io from "socket.io-client";
import { putData, postData } from "../../utils/sendData";
import {
  fetchNetboxDevice,
  fetchNetboxInterfaces,
  fetchNetboxModel,
} from "../../services/netbox";
import { DeviceInfoTable } from "../DeviceInfoTable";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { NewInterface } from "./NewInterface";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { CommitModalAccess, CommitModalDist } from "./CommitModal";
import { ImportInterfaceModal } from "./ImportInterfaceModal";
import { useDevice } from "../../hooks/useDevice";
import { useDeviceInterfaceConfig } from "../../hooks/useDeviceInterfaceConfig";
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

export function InterfaceConfig() {
  const { token } = useAuthToken();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hostname = searchParams.get("hostname") ?? null;

  // --- Data from hooks ---
  const { device, reload: reloadDevice } = useDevice(hostname);
  const {
    settings,
    interfaces,
    fieldOptions,
    mlagPeerHostname,
    thirdPartyUpdate,
    refreshInterfaceStatus,
    reloadDeviceData: reloadInterfaceData,
    getInterfaceData,
    addTagOption,
    addPortTemplateOption,
    addNewInterface,
    markThirdPartyUpdate,
  } = useDeviceInterfaceConfig(hostname, device?.device_type);

  // Local synchronized override — updated optimistically by socket events
  const [synchronized_, setSynchronized] = useState(null);
  const deviceSynchronized = synchronized_ ?? device?.synchronized ?? null;

  useEffect(() => {
    if (device?.synchronized != null) {
      setSynchronized(device.synchronized);
    }
  }, [device?.synchronized]);

  // --- Netbox (separate external system) ---
  const [netbox, setNetbox] = useState({
    device: null,
    interfaces: [],
    model: null,
  });

  useEffect(() => {
    if (!hostname || !device?.device_type) return;
    const fetchNetboxData = async () => {
      const [netboxDevice, netboxModel] = await Promise.all([
        fetchNetboxDevice(hostname),
        device.model ? fetchNetboxModel(device.model) : null,
      ]);
      const netboxInterfaces = netboxDevice
        ? await fetchNetboxInterfaces(netboxDevice.id)
        : [];
      setNetbox({
        device: netboxDevice,
        interfaces: netboxInterfaces,
        model: netboxModel,
      });
    };
    fetchNetboxData();
  }, [hostname, device?.device_type, device?.model]);

  // --- Local UI & edit state ---
  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [autoPushJobs, setAutoPushJobs] = useState([]);
  const [displayColumns, setDisplayColumns] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [interfaceBounceRunning, setInterfaceBounceRunning] = useState({});
  const [interfaceDataUpdated, setInterfaceDataUpdated] = useState({});
  const [interfaceToggleUntagged, setInterfaceToggleUntagged] = useState({});
  const [isWorking, setIsWorking] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const awaitingDeviceSynchronizationRef = useRef(false);

  // Wrap the hook's reload to also reload device, clear local edit state and dismiss toasts
  const reloadDeviceData = useCallback(() => {
    document
      .querySelectorAll(".ui.floating.message")
      .forEach((el) => el.remove());
    setInterfaceDataUpdated({});
    reloadDevice();
    reloadInterfaceData();
  }, [reloadDevice, reloadInterfaceData]);

  // --- Column preferences ---

  const setDisplayColumnsFn = useCallback(() => {
    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};
    let newDisplayColumns;
    if (device?.device_type === "ACCESS") {
      newDisplayColumns = interfaceConfig?.accessDisplayColumns;
    } else if (device?.device_type === "DIST") {
      newDisplayColumns = interfaceConfig?.distDisplayColumns;
    }

    setDisplayColumns(
      (newDisplayColumns ?? ["vlans"]).filter((column) =>
        VALID_COLUMNS.has(column),
      ),
    );
  }, [device?.device_type]);

  useEffect(() => {
    if (device?.device_type) {
      setDisplayColumnsFn();
    }
  }, [device?.device_type, setDisplayColumnsFn]);

  // --- Socket IO ---

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

  const handleSocketEventRef = useRef();

  useEffect(() => {
    handleSocketEventRef.current = (data) => {
      if (
        data.device_id &&
        data?.device_id === device?.id &&
        data.action === "UPDATED"
      ) {
        onDeviceUpdateEvent(data);
      } else if (data?.job_id) {
        onJobUpdateEvent(data);
      }
    };
  });

  const onDeviceUpdateEvent = (data) => {
    console.debug("Device update event", data);

    const updatedDeviceData = data.object;

    if (
      awaitingDeviceSynchronizationRef.current &&
      updatedDeviceData.synchronized
    ) {
      awaitingDeviceSynchronizationRef.current = false;
      reloadDeviceData();
    } else {
      setSynchronized(updatedDeviceData.synchronized);
      if (!isWorking && deviceSynchronized !== updatedDeviceData.synchronized) {
        showSynchronizedChangedToast(updatedDeviceData.synchronized);
      }
      if (!isWorking && updatedDeviceData.confhash !== device?.confhash) {
        markThirdPartyUpdate();
        showOutOfSyncToast(reloadDeviceData);
      }
    }
  };

  const onJobUpdateEvent = (data) => {
    console.debug("Job update event", data);

    if (autoPushJobs.length === 1 && autoPushJobs[0].job_id === data.job_id) {
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
          <Link key="dryrun" to={`/config-change?hostname=${hostname}`}>
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
        awaitingDeviceSynchronizationRef.current = true;
      }
    }
  };

  // --- Save & commit logic ---

  const prepareSendJson = () => {
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

        const prevIntf = interfaces.data.find(
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
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`;
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
        hostname: hostname,
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
      navigate(
        `/config-change?hostname=${hostname}&scrollTo=dry_run&autoDryRun=true`,
      );
    } else {
      setAccordionActiveIndex(2);
    }
  };

  const gotoConfigChange = () => {
    navigate(`/config-change?hostname=${hostname}&scrollTo=refreshrepo`);
  };

  // --- Field editing ---

  const updateFieldData = (_e, data) => {
    const nameSplit = data.name.split("|", 2);
    const interfaceName = nameSplit[1];
    const jsonKey = nameSplit[0];
    const defaultValue =
      "defaultChecked" in data ? data.defaultChecked : data.defaultValue;
    let val = "defaultChecked" in data ? data.checked : data.value;

    if (
      device?.device_type === "DIST" &&
      ["untagged_vlan", "tagged_vlan_list"].includes(jsonKey)
    ) {
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
      const url = `${process.env.API_URL}/api/v1.0/device/${hostname}/interface_status`;
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

  // --- Column selector ---

  const columnSelectorChange = (_e, data) => {
    let columnOrder;
    if (device?.device_type === "ACCESS") {
      columnOrder = Object.keys(ALLOWED_COLUMNS_ACCESS);
    } else if (device?.device_type === "DIST") {
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

    newDisplayColumns.sort(
      (a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b),
    );

    setDisplayColumns(newDisplayColumns);

    const interfaceConfig =
      JSON.parse(localStorage.getItem("interfaceConfig")) ?? {};

    if (device?.device_type === "ACCESS") {
      interfaceConfig.accessDisplayColumns = newDisplayColumns;
    } else if (device?.device_type === "DIST") {
      interfaceConfig.distDisplayColumns = newDisplayColumns;
    }

    localStorage.setItem("interfaceConfig", JSON.stringify(interfaceConfig));
  };

  // --- Export ---

  const exportInterfaceConfig = async (exportHostname) => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/v1.0/device/${exportHostname}/interfaces_export`,
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
      link.download = `${exportHostname}_interfaces.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // --- Render helpers ---

  const interfaceTable = interfaces.data.map((item, index) => (
    <InterfaceTableRow
      key={item.name}
      item={item}
      index={index}
      deviceType={device?.device_type}
      interfaceDataUpdated={interfaceDataUpdated}
      vlanOptions={fieldOptions.vlans}
      untaggedVlanOptions={fieldOptions.untaggedVlans}
      displayColumns={displayColumns}
      deviceSettings={settings}
      tagOptions={fieldOptions.tags}
      portTemplateOptions={fieldOptions.portTemplates}
      interfaceStatusData={interfaces.status}
      interfaceBounceRunning={interfaceBounceRunning}
      netboxInterfaceData={netbox.interfaces}
      lldpNeighborData={interfaces.lldpNeighbors}
      hostname={hostname}
      updateFieldData={updateFieldData}
      addTagOption={addTagOption}
      addPortTemplateOption={addPortTemplateOption}
      submitBounce={() => submitBounce(item.name)}
      untaggedClick={untaggedClick}
      interfaceToggleUntagged={interfaceToggleUntagged}
    />
  ));

  const commitAutopushDisabled =
    isWorking || thirdPartyUpdate || !deviceSynchronized;

  const allowedColumns = ALLOWED_COLUMNS_MAP[device?.device_type] || {};

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

  let commitModal = null;
  if (device?.device_type === "ACCESS") {
    commitModal = (
      <CommitModalAccess
        accordionActiveIndex={accordionActiveIndex}
        accordionClick={accordionClick}
        autoPushJobsHTML={autoPushJobsHTML}
        errorMessage={errorMessage}
        interfaceDataUpdatedJSON={prepareSendJson()}
      />
    );
  } else if (device?.device_type === "DIST") {
    commitModal = (
      <CommitModalDist
        hostname={hostname}
        interfaceDataUpdated={interfaceDataUpdated}
        ifDataYaml={prepareYaml()}
      />
    );
  }

  // find unused interfaces
  const unusedInterfaces = interfaces.status
    ? Object.keys(interfaces.status).filter(
        (ifName) =>
          !interfaces.data.find(
            (obj) => obj.name.toLowerCase() === ifName.toLowerCase(),
          ),
      )
    : [];

  let tableLevelButtons = [];
  if (device?.device_type === "ACCESS") {
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
              exportInterfaceConfig(hostname);
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
        {device && (
          <DeviceInfoTable
            device={device}
            model={netbox.model}
            netboxDevice={netbox.device}
          />
        )}
        {mlagPeerInfo}
        <p>
          Sync state:{" "}
          {deviceSynchronized ? (
            <Icon name="check" color="green" />
          ) : (
            <Icon name="delete" color="red" />
          )}
        </p>
        {!deviceSynchronized && (
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
                  {device?.device_type === "DIST"
                    ? "Interface class"
                    : "Configtype"}
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
                      {device?.device_type === "ACCESS" && [
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
                      {device?.device_type === "DIST" && (
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
                  {device?.device_type === "DIST" && [
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
            hostname={hostname}
            getInterfaceData={getInterfaceData}
          />
        </div>
      </div>
    </section>
  );
}
