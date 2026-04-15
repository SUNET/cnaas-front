import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router";
import { Button, Checkbox, Icon, Modal, Popup, Table } from "semantic-ui-react";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import { DeviceInfoTable } from "../DeviceInfoTable";
import { InterfaceTableRow } from "./InterfaceTableRow/InterfaceTableRow";
import { NewInterface } from "./NewInterface";
import { CommitModalAccess, CommitModalDist } from "./CommitModal";
import { ImportInterfaceModal } from "./ImportInterfaceModal";
import { useInterfaceConfig } from "./InterfaceConfigContext";
import { useInterfaceConfigSocket } from "./useInterfaceConfigSocket";

// --- Constants ---

const ALLOWED_COLUMNS_ACCESS: Record<string, string> = {
  vlans: "VLANs",
  tags: "Tags",
  json: "Raw JSON",
  aggregate_id: "LACP aggregate ID",
  bpdu_filter: "BPDU filter",
};

const ALLOWED_COLUMNS_DIST: Record<string, string> = {
  vlans: "VLANs",
  tags: "Tags",
  aggregate_id: "LACP aggregate ID",
  config: "Custom config",
};

const ALLOWED_COLUMNS_MAP: Record<string, Record<string, string>> = {
  ACCESS: ALLOWED_COLUMNS_ACCESS,
  DIST: ALLOWED_COLUMNS_DIST,
};

const COLUMN_WIDTHS: Record<string, number> = {
  vlans: 4,
  tags: 3,
  json: 1,
  aggregate_id: 3,
  bpdu_filter: 1,
};

// --- Props ---

interface InterfaceConfigProps {
  hostname: string | null;
}

// --- Component ---

export function InterfaceConfig({ hostname }: InterfaceConfigProps) {
  const navigate = useNavigate();
  const {
    state,
    dispatch,
    awaitingSync,
    reloadAllData,
    refreshInterfaceStatus,
    loadInterfaces,
    updateField,
    toggleUntagged,
    addTagOption,
    addPortTemplateOption,
    addNewInterface,
    setDisplayColumns,
    saveInterfaces,
    startAutoPush,
    bounceInterface,
    exportInterfaces,
  } = useInterfaceConfig();

  // Connect socket
  useInterfaceConfigSocket({ dispatch, state, awaitingSync, reloadAllData });

  // --- Toast notifications for socket-driven state changes ---

  const prevSynchronized = useRef(state.synchronized);
  const prevThirdPartyUpdate = useRef(state.thirdPartyUpdate);

  useEffect(() => {
    const wasSync = prevSynchronized.current;
    prevSynchronized.current = state.synchronized;

    if (
      !state.isWorking &&
      !state.ownUpdateInProgress &&
      wasSync !== null &&
      state.synchronized !== null &&
      wasSync !== state.synchronized
    ) {
      toast({
        type: "warning",
        icon: "paper plane",
        title: "Synchronized state was changed!",
        description: (
          <p>
            Device state was changed to {String(state.synchronized)} by a third
            party.
          </p>
        ),
        animation: "bounce",
        time: 0,
      });
    }
  }, [state.synchronized, state.isWorking]);

  useEffect(() => {
    const wasThirdParty = prevThirdPartyUpdate.current;
    prevThirdPartyUpdate.current = state.thirdPartyUpdate;

    if (!wasThirdParty && state.thirdPartyUpdate) {
      toast({
        type: "warning",
        icon: "paper plane",
        title: "Device was updated elsewhere!",
        description: (
          <p>
            Device has been updated by a third party, this page is out of sync.
            <br />
            <Button onClick={reloadAllData}>Refresh</Button>
          </p>
        ),
        animation: "bounce",
        time: 0,
      });
    }
  }, [state.thirdPartyUpdate, reloadAllData]);

  // --- Local UI state (not shared) ---

  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // --- Derived values ---

  const { device } = state;
  const deviceType = device?.device_type;
  const synchronized = state.synchronized;
  const allowedColumns = (deviceType && ALLOWED_COLUMNS_MAP[deviceType]) || {};
  const commitAutopushDisabled =
    state.isWorking || state.thirdPartyUpdate || !synchronized;

  // --- Callbacks ---

  const handleUpdateFieldData = useCallback(
    (_e: SyntheticEvent, data: Record<string, unknown>) => {
      const nameStr = data.name as string;
      const [field, interfaceName] = nameStr.split("|", 2);
      const defaultValue =
        "defaultChecked" in data ? data.defaultChecked : data.defaultValue;
      let val: unknown = "defaultChecked" in data ? data.checked : data.value;

      if (
        deviceType === "DIST" &&
        ["untagged_vlan", "tagged_vlan_list"].includes(field)
      ) {
        if (Array.isArray(data.value)) {
          val = (data.value as string[]).map((opt) => {
            const options = data.options as Array<{
              value: string;
              description: string;
            }>;
            const found = options.find((e) => e.value === opt);
            return found ? found.description : null;
          });
        } else {
          const options = data.options as Array<{
            value: string;
            description: string;
          }>;
          const found = options.find((e) => e.value === data.value);
          val = found ? found.description : null;
        }
      }

      if (field === "aggregate_id") {
        val = parseInt(val as string, 10);
        if (isNaN(val as number)) val = null;
      }

      updateField(interfaceName, field, val, defaultValue);
    },
    [deviceType, updateField],
  );

  const handleUntaggedClick = useCallback(
    (_e: SyntheticEvent, data: Record<string, unknown>) => {
      toggleUntagged(data.id as string, data.name === "untagged");
    },
    [toggleUntagged],
  );

  const handleAccordionClick = (
    _e: SyntheticEvent,
    titleProps: { index: number },
  ) => {
    setAccordionActiveIndex((prev) =>
      prev === titleProps.index ? -1 : titleProps.index,
    );
  };

  const handleColumnChange = (
    _e: SyntheticEvent,
    data: { checked?: boolean; name?: string },
  ) => {
    const columnOrder = Object.keys(allowedColumns);
    const next = [...state.displayColumns];

    if (data.checked && data.name && !next.includes(data.name)) {
      next.push(data.name);
    } else if (!data.checked && data.name) {
      const idx = next.indexOf(data.name);
      if (idx > -1) next.splice(idx, 1);
    }

    next.sort((a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b));
    setDisplayColumns(next);
  };

  const closeSaveModal = () => {
    setSaveModalOpen(false);
    setErrorMessage(null);
    setAccordionActiveIndex(0);
  };

  // --- Save & commit ---

  const prepareSendJson = (): Record<string, unknown> => {
    const sendData: { interfaces: Record<string, Record<string, unknown>> } = {
      interfaces: {},
    };

    Object.entries(state.interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const topLevelKeys: Record<string, unknown> = {};
        const dataLevelKeys: Record<string, unknown> = {};

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

  const prepareYaml = (): Record<string, unknown> => {
    const sendData: { interfaces: Record<string, unknown>[] } = {
      interfaces: [],
    };

    Object.entries(state.interfaceDataUpdated).forEach(
      ([interfaceName, formData]) => {
        const ifData: Record<string, unknown> = { name: interfaceName };

        const prevIntf = state.interfaces.find(
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
              // skip
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

  const saveAndCommitChanges = async () => {
    const { success, error } = await saveInterfaces(prepareSendJson());
    if (success) {
      startAutoPush();
      setAccordionActiveIndex(3);
    } else {
      setErrorMessage(error ?? null);
      setAccordionActiveIndex(2);
    }
  };

  const saveChanges = async () => {
    const { success, error } = await saveInterfaces(prepareSendJson());
    if (success) {
      navigate(
        `/config-change?hostname=${hostname}&scrollTo=dry_run&autoDryRun=true`,
      );
    } else {
      setErrorMessage(error ?? null);
      setAccordionActiveIndex(2);
    }
  };

  const gotoConfigChange = () => {
    navigate(`/config-change?hostname=${hostname}&scrollTo=refreshrepo`);
  };

  // --- Render helpers ---

  const autoPushJobsHTML: ReactNode[] = state.autoPushJobs.map((job, index) => {
    let jobIcon: ReactNode = null;
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
  });

  const unusedInterfaces = state.interfaceStatus
    ? Object.keys(state.interfaceStatus).filter(
        (ifName) =>
          !state.interfaces.find(
            (obj) => obj.name.toLowerCase() === ifName.toLowerCase(),
          ),
      )
    : [];

  const columnHeaders = state.displayColumns.map((col) => (
    <Table.HeaderCell
      width={COLUMN_WIDTHS[col] as 1 | 2 | 3 | 4 | 5 | 6}
      key={col}
    >
      {allowedColumns[col]}
    </Table.HeaderCell>
  ));

  const columnSelectors = Object.keys(allowedColumns).map((col) => {
    const checked = state.displayColumns.includes(col);
    const disabled = Object.values(state.interfaceDataUpdated).some(
      (ifData: Record<string, unknown>) => Object.keys(ifData).includes(col),
    );
    return (
      <li key={col}>
        <Checkbox
          defaultChecked={checked}
          disabled={disabled}
          label={allowedColumns[col]}
          name={col}
          onChange={handleColumnChange}
        />
      </li>
    );
  });

  // --- Commit modal content ---

  let commitModal: ReactNode = null;
  if (deviceType === "ACCESS") {
    commitModal = (
      <CommitModalAccess
        accordionActiveIndex={accordionActiveIndex}
        accordionClick={handleAccordionClick}
        autoPushJobsHTML={autoPushJobsHTML}
        errorMessage={errorMessage}
        interfaceDataUpdatedJSON={prepareSendJson()}
      />
    );
  } else if (deviceType === "DIST") {
    commitModal = (
      <CommitModalDist hostname={hostname} ifDataYaml={prepareYaml()} />
    );
  }

  // --- JSX ---

  return (
    <section>
      <SemanticToastContainer position="top-right" maxToasts={1} />
      <div id="device_list">
        <h2>Interface configuration</h2>

        {device && (
          <DeviceInfoTable
            device={device}
            model={state.netboxModel}
            netboxDevice={state.netboxDevice}
          />
        )}

        {state.mlagPeerHostname && (
          <p>
            MLAG peer hostname:{" "}
            <Link to={`/interface-config?hostname=${state.mlagPeerHostname}`}>
              {state.mlagPeerHostname}
            </Link>
          </p>
        )}

        <p>
          Sync state:{" "}
          {synchronized ? (
            <Icon name="check" color="green" />
          ) : (
            <Icon name="delete" color="red" />
          )}
        </p>

        {!synchronized && (
          <p>
            <Icon name="warning sign" color="orange" size="large" />
            Device is not synchronized, use dry_run and verify diff to apply
            changes.
          </p>
        )}

        {state.thirdPartyUpdate && (
          <p>
            <Icon name="warning sign" color="orange" size="large" />
            Device has been updated by a third party. Reload page to get the
            latest changes (local changes will be lost).{" "}
            <Button size="mini" onClick={reloadAllData}>
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

          {deviceType === "ACCESS" && (
            <>
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
                    onClick={() => exportInterfaces(hostname!)}
                  >
                    <Icon name="share square" />
                  </Button>
                }
              >
                Export interface configuration as downloadable JSON file
              </Popup>
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
                    onClick={() => setImportModalOpen(true)}
                  >
                    <Icon name="add square" />
                  </Button>
                }
              >
                Import interface configuration from a JSON file
              </Popup>
            </>
          )}
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

            <Table.Body>
              {state.interfaces.map((item, index) => (
                <InterfaceTableRow
                  key={item.name}
                  item={item}
                  index={index}
                  updateFieldData={handleUpdateFieldData}
                  addTagOption={(
                    _e: SyntheticEvent,
                    data: Record<string, unknown>,
                  ) => addTagOption(data.value as string)}
                  addPortTemplateOption={(
                    _e: SyntheticEvent,
                    data: Record<string, unknown>,
                  ) => addPortTemplateOption(data.value as string)}
                  submitBounce={() => bounceInterface(item.name)}
                  untaggedClick={handleUntaggedClick}
                />
              ))}
            </Table.Body>

            <Table.Footer fullWidth>
              <Table.Row>
                <Table.HeaderCell colSpan={3 + state.displayColumns.length}>
                  <Modal
                    onClose={closeSaveModal}
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
                        onClick={closeSaveModal}
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
                          disabled={state.isWorking}
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
                  {deviceType === "DIST" && (
                    <NewInterface
                      suggestedInterfaces={unusedInterfaces}
                      addNewInterface={addNewInterface}
                    />
                  )}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Footer>
          </Table>

          <ImportInterfaceModal
            open={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            hostname={hostname!}
            getInterfaceData={loadInterfaces}
          />
        </div>
      </div>
    </section>
  );
}
