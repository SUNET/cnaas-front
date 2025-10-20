import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { SemanticToastContainer, toast } from "react-semantic-toasts-2";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Dropdown,
  Grid,
  GridColumn,
  GridRow,
  Icon,
  Input,
  Loader,
  Modal,
  Pagination,
  Popup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import { getData, getDataToken, getResponse } from "../../utils/getData";
import { deleteData, postData, putData } from "../../utils/sendData";

import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { io } from "socket.io-client";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import AddMgmtDomainModal from "./AddMgmtDomainModal";
import DeviceInfoBlock from "./DeviceInfoBlock";
import DeviceInitForm from "./DeviceInitForm";
import ShowConfigModal from "./ShowConfigModal";
import UpdateMgmtDomainModal from "./UpdateMgmtDomainModal";

let socket = null;

const columnMap = {
  id: "ID",
  hostname: "Hostname",
  device_type: "Device type",
  state: "State",
  synchronized: "Sync status",
  model: "Model",
  os_version: "OS version",
  management_ip: "Management IP",
  dhcp_ip: "DHCP IP",
  serial: "Serial",
  vendor: "Vendor",
  platform: "Platform",
};

const perPageOptions = [
  { key: 20, value: 20, text: "20" },
  { key: 50, value: 50, text: "50" },
  { key: 100, value: 100, text: "100" },
  { key: 500, value: 500, text: "500" },
  { key: 1000, value: 1000, text: "1000" },
];

function DeviceTableButtonGroup({
  activeColumns,
  setFilterActive,
  setFilterData,
  columnSelectorChange,
  resultsPerPage,
  setActivePage,
  setResultsPerPage,
  setSortColumn,
  setSortDirection,
}) {
  const extraColumns = [
    "model",
    "os_version",
    "management_ip",
    "dhcp_ip",
    "serial",
    "vendor",
    "platform",
  ];
  return (
    <ButtonGroup icon>
      <Button
        icon
        basic
        size="small"
        onClick={() => {
          setFilterActive((prev) => !prev);
        }}
        title="Search / Filter"
      >
        <Icon name="filter" />
      </Button>
      <Button
        icon
        basic
        size="small"
        onClick={() => {
          setFilterActive(false);
          setFilterData({});
          setSortColumn(null);
          setSortDirection(null);
        }}
        title="Clear Filter and Sorting"
      >
        <Icon name="close" />
      </Button>
      <Popup
        on="click"
        pinned
        position="bottom right"
        trigger={
          <Button icon basic size="small" title="Select Columns">
            <Icon name="columns" />
          </Button>
        }
      >
        <p>Items per page:</p>
        <Select
          options={perPageOptions}
          value={resultsPerPage}
          onChange={(e, { value }) => {
            setResultsPerPage(value);
            // Make sure page resets to 1 when changing this option
            setActivePage(1);
          }}
        />
        <p>Show extra columns:</p>
        <ul>
          {extraColumns.map((columnName) => {
            const checked = activeColumns.includes(columnName);
            return (
              <li key={columnName}>
                <Checkbox
                  defaultChecked={checked}
                  label={columnMap[columnName]}
                  name={columnName}
                  onClick={() => {
                    columnSelectorChange(columnName);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </Popup>
    </ButtonGroup>
  );
}

DeviceTableButtonGroup.propTypes = {
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  setFilterActive: PropTypes.func,
  setFilterData: PropTypes.func,
  columnSelectorChange: PropTypes.func,
  resultsPerPage: PropTypes.number,
  setActivePage: PropTypes.func,
  setResultsPerPage: PropTypes.func,
  setSortColumn: PropTypes.func,
  setSortDirection: PropTypes.func,
};

function DeviceTableHeader({
  activeColumns,
  sortColumn,
  sortDirection,
  filterActive,
  filterData,
  sortClick,
  handleFilterChange,
}) {
  const [localFilter, setLocalFilter] = useState(filterData);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    setLocalFilter(filterData);
  }, [filterData]);

  const onChange = (column, value) => {
    // Update input immediately
    setLocalFilter((prev) => ({ ...prev, [column]: value }));

    // Clear previous debounce
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    // Set new debounce
    debounceTimeout.current = setTimeout(() => {
      handleFilterChange(column, value); // triggers fetch
    }, 300);
  };

  return (
    <TableHeader>
      <TableRow>
        {activeColumns.map((column) => {
          return (
            <TableHeaderCell
              key={column}
              onClick={() => sortClick(column)}
              sorted={sortColumn === column ? sortDirection : null}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              collapsing
            >
              {columnMap[column]}
            </TableHeaderCell>
          );
        })}
      </TableRow>
      {/* Setup filter data */}
      {filterActive && (
        <TableRow>
          {activeColumns.map((column) => (
            <TableHeaderCell key={`filter_${column}`} collapsing>
              <Input
                value={localFilter[column] || ""}
                placeholder={`Filter ${columnMap[column]}`}
                onChange={(e) => onChange(column, e.target.value)}
                // fluid
                style={{ minWidth: "1em" }}
              />
            </TableHeaderCell>
          ))}
        </TableRow>
      )}
    </TableHeader>
  );
}

DeviceTableHeader.propTypes = {
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.string,
  filterActive: PropTypes.bool,
  filterData: PropTypes.object,
  sortClick: PropTypes.func,
  handleFilterChange: PropTypes.func,
};

function DeviceTableBodyRowCellContent({ device, column, open }) {
  const value = device[column];

  if (typeof value === "boolean") {
    return (
      <Icon name={value ? "check" : "delete"} color={value ? "green" : "red"} />
    );
  }
  if (column == "id") {
    return (
      <>
        <Icon name={open ? "angle down" : "angle right"} />
        {value}
      </>
    );
  }
  if (
    column === "hostname" &&
    device.state === "MANAGED" &&
    device.device_type === "ACCESS"
  ) {
    return (
      <>
        {value}
        {column === "hostname" &&
          device.state === "MANAGED" &&
          device.device_type === "ACCESS" && (
            <a
              key="interfaceconfig"
              href={`/interface-config?hostname=${device.hostname}`}
            >
              <Icon name="plug" link />
            </a>
          )}
      </>
    );
  }
  return value;
}

DeviceTableBodyRowCellContent.propTypes = {
  device: PropTypes.object,
  column: PropTypes.string,
  open: PropTypes.bool,
};

function DeviceTableBodyRow({
  device,
  activeColumns,
  mangleDeviceData,
  defaultOpen,
  getAdditionalDeviceData,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const deviceInfo = mangleDeviceData(device);

  // When device changes and defaultOpen is set open the row
  useEffect(() => {
    if (!open && defaultOpen) {
      getAdditionalDeviceData(device.hostname);
      setOpen(true);
      // If the row is already opened we can fetch additional data
    } else if (open && defaultOpen) {
      getAdditionalDeviceData(device.hostname);
    }
  }, [device]);

  const handleRowClick = () => {
    // Only fetch when opening the row
    // That means the current state is open == false
    if (!open) getAdditionalDeviceData(device.hostname);
    setOpen((prev) => !prev);
  };

  return (
    <>
      <TableRow key={device.id} onClick={() => handleRowClick()}>
        {activeColumns.map((column) => (
          <TableCell
            key={`${device.id}_${column}`}
            collapsing
            style={{ overflow: "hidden" }}
          >
            <DeviceTableBodyRowCellContent
              device={device}
              column={column}
              open={open}
            />
          </TableCell>
        ))}
      </TableRow>
      <TableRow key={`${device.id}_content`} hidden={!open}>
        <TableCell
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
          }}
        >
          {deviceInfo}
        </TableCell>
      </TableRow>
    </>
  );
}

DeviceTableBodyRow.propTypes = {
  device: PropTypes.object,
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  mangleDeviceData: PropTypes.func,
  defaultOpen: PropTypes.bool,
  getAdditionalDeviceData: PropTypes.func,
};

function DeviceTableBody({
  deviceData,
  activeColumns,
  loading,
  error,
  mangleDeviceData,
  defaultOpen,
  getAdditionalDeviceData,
}) {
  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>
            <Loader active inline="centered">
              Loading
            </Loader>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>API Error: {error.message}</TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (deviceData.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell>No data</TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {deviceData?.map((device) => (
        <DeviceTableBodyRow
          key={`${device.id}_row`}
          device={device}
          activeColumns={activeColumns}
          mangleDeviceData={mangleDeviceData}
          defaultOpen={defaultOpen}
          getAdditionalDeviceData={getAdditionalDeviceData}
        />
      ))}
    </TableBody>
  );
}

DeviceTableBody.propTypes = {
  deviceData: PropTypes.arrayOf(PropTypes.object),
  activeColumns: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  error: PropTypes.object,
  defaultOpen: PropTypes.bool,
  mangleDeviceData: PropTypes.func,
  getAdditionalDeviceData: PropTypes.func,
};

function DeviceList() {
  const getInitialSettings = () => {
    const defaultSettings = {
      activePage: 1,
      activeColumns: ["id", "hostname", "device_type", "state", "synchronized"],
      sortColumn: null,
      sortDirection: null,
      filterActive: false,
      filterData: {},
      resultsPerPage: 20,
    };

    // Load from localStorage
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem("deviceList") || "{}");
    } catch (e) {
      console.warn("Failed to parse localStorage deviceList settings:", e);
    }

    // Extract filters from URL query params
    const params = new URLSearchParams(globalThis.location.search);
    const locationFilterData = {};
    for (const [key, value] of params.entries()) {
      const match = key.match(/^filter\[(.+)\]$/);
      if (match) locationFilterData[match[1]] = value;
    }
    const hasLocationFilterData = Object.keys(locationFilterData).length > 0;
    // Merge defaults + stored
    const initial = { ...defaultSettings, ...stored };

    // Ensure filtered columns are visible and unique
    initial.activeColumns = [
      ...new Set([
        ...defaultSettings.activeColumns,
        ...initial.activeColumns,
        ...Object.keys(initial.filterData || {}),
        ...Object.keys(locationFilterData),
      ]),
    ].sort(
      (a, b) =>
        Object.keys(columnMap).indexOf(a) - Object.keys(columnMap).indexOf(b),
    );

    // Reset page if URL filters exist
    if (hasLocationFilterData) {
      initial.activePage = 1;
    }

    return {
      ...initial,
      filterData: hasLocationFilterData
        ? locationFilterData
        : initial.filterData,
      filterActive:
        Object.keys(
          hasLocationFilterData ? locationFilterData : initial.filterData,
        ).length > 0,
    };
  };

  const [initialSettings] = useState(() => getInitialSettings());

  const [activePage, setActivePage] = useState(initialSettings.activePage);
  const [activeColumns, setActiveColumns] = useState(
    initialSettings.activeColumns,
  );
  const [sortColumn, setSortColumn] = useState(initialSettings.sortColumn);
  const [sortDirection, setSortDirection] = useState(
    initialSettings.sortDirection,
  );
  const [filterData, setFilterData] = useState(initialSettings.filterData);
  const [filterActive, setFilterActive] = useState(
    initialSettings.filterActive,
  );
  const [resultsPerPage, setResultsPerPage] = useState(
    initialSettings.resultsPerPage,
  );

  const [totalPages, setTotalPages] = useState(1);
  const [deviceData, setDeviceData] = useState([]);
  const [mgmtDomainsData, setMgmtDomainsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [expandResult, setExpandResult] = useState(false);

  const [deviceInterfaceData, setDeviceInterfaceData] = useState({});
  const [netboxModelData, setNetboxModelData] = useState({});
  const [netboxDeviceData, setNetboxDeviceData] = useState({});
  const [deviceJobs, setDeviceJobs] = useState({});
  const [logLines, setLogLines] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalDeviceId, setDeleteModalDeviceId] = useState(null);
  const [deleteModalDeviceState, setDeleteModalDeviceState] = useState(null);
  const [deleteModalDeviceType, setDeleteModalDeviceType] = useState(null);
  const [deleteModalDeviceHostname, setDeleteModalDeviceHostname] =
    useState("");
  const [deleteModalConfirmName, setDeleteModalConfirmName] = useState("");
  const [deleteModalFactoryDefault, setDeleteModalFactoryDefault] =
    useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [mgmtAddModalOpen, setMgmtAddModalOpen] = useState(false);
  const [mgmtUpdateModalOpen, setMgmtUpdateModalOpen] = useState(false);
  const [mgmtUpdateModalInput, setMgmtUpdateModalInput] = useState({});
  const [mgmtAddModalInput, setMgmtAddModalInput] = useState({});
  const [showConfigModalOpen, setShowConfigModalOpen] = useState(false);
  const [showConfigModalHostname, setShowConfigModalHostname] = useState(null);
  const [showConfigModalState, setShowConfigModalState] = useState(null);

  const history = useHistory();

  const { token } = useAuthToken();

  let discoveredDeviceIds = new Set();

  const populateDiscoveredDevices = async () => {
    const url = `${process.env.API_URL}/api/v1.0/devices?filter[state]=DISCOVERED`;
    try {
      const data = await getData(url, token);

      data.data.devices.forEach((dev) => {
        discoveredDeviceIds.add(dev.id);
      });
    } catch (error) {
      setError(error);
    }
  };

  const getAllMgmtDomainsData = async () => {
    try {
      const data = await getData(
        `${process.env.API_URL}/api/v1.0/mgmtdomains`,
        token,
      );
      setMgmtDomainsData(data.data.mgmtdomains);
    } catch (error) {
      setError(error);
    }
  };

  const addDeviceJob = (deviceId, jobId) => {
    setDeviceJobs((prev) => {
      const updated = { ...prev };

      if (deviceId in updated) {
        updated[deviceId] = [...updated[deviceId], jobId];
      } else {
        updated[deviceId] = [jobId];
      }

      return updated;
    });
  };

  const findAction = (event, filterData, toast) => {
    if (toast) {
      // close toast
      event.target.parentElement.parentElement.parentElement.parentElement.remove();
    }
    history.push();
    setActivePage(1);
    setFilterData(filterData);
    setFilterActive(Object.keys(filterData).length > 0);
    // Expand results when looking up device
    setExpandResult(true);
    window.scrollTo(0, 0);
  };

  // When devices change (after getDevices updates them), reset expandResult
  useEffect(() => {
    if (expandResult) {
      setExpandResult(false);
    }
  }, [deviceData]); // runs after re-render with new devices

  useEffect(() => {
    const populatePromise = populateDiscoveredDevices();
    const mgmtDomainsPromise = getAllMgmtDomainsData();

    // Make sure we set loading to false when all fetches have settled
    Promise.allSettled([populatePromise, mgmtDomainsPromise]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Update deviceData on changes
  useEffect(() => {
    getDevices();
  }, [sortColumn, sortDirection, filterData, activePage, resultsPerPage]);

  // Set localStorage on changes
  useEffect(() => {
    const storageData = {
      activeColumns,
      sortColumn,
      sortDirection,
      filterData,
      resultsPerPage,
      activePage,
    };
    localStorage.setItem("deviceList", JSON.stringify(storageData));
  }, [
    activeColumns,
    sortColumn,
    sortDirection,
    filterData,
    activePage,
    resultsPerPage,
  ]);

  const getDevices = async () => {
    const operatorMap = {
      id: "[equals]",
      // eslint-disable-next-line camelcase
      device_type: "[ilike]",
      state: "[ilike]",
      synchronized: "",
    };

    let sort = "";

    if (sortDirection && sortColumn) {
      const prefix = sortDirection === "ascending" ? "" : "-";
      sort = `&sort=${prefix}${sortColumn}`;
    }

    const filterString = Object.entries(filterData)
      .filter(([, value]) => value) // skip empty filters
      .map(([key, value]) => {
        const operator = operatorMap[key] ?? "[contains]";
        return `&filter[${encodeURIComponent(key)}]${operator}=${encodeURIComponent(value)}`;
      })
      .join("&");

    try {
      const resp = await getResponse(
        `${process.env.API_URL}/api/v1.0/devices?page=${activePage}&per_page=${resultsPerPage}${sort}${filterString}`,
        token,
      );

      const totalCountHeader = resp.headers.get("X-Total-Count");
      if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
        const totalPages = Math.ceil(totalCountHeader / resultsPerPage);
        setTotalPages(totalPages);
      } else {
        setTotalPages(1);
      }

      const data = await resp.json();

      setDeviceData(data.data.devices);
    } catch {
      setDeviceData([]);
    }
  };
  const sortClick = (column) => {
    if (column === sortColumn) {
      setSortDirection((prev) =>
        prev === "ascending" ? "descending" : "ascending",
      );
    } else {
      setSortDirection("descending");
    }
    setSortColumn(column);
  };

  const handleFilterChange = (column, value) => {
    setFilterData((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const handleAddMgmtDomains = (id) => {
    toast({
      type: "success",
      title: `Management domain ${id} added`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    setMgmtAddModalOpen(false);
  };

  const handleDeleteMgmtDomain = (id) => {
    toast({
      type: "success",
      title: `Management domain ${id} deleted`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    setMgmtUpdateModalOpen(false);
  };

  const handleUpdateMgmtDomains = (id) => {
    toast({
      type: "success",
      title: `Management domain ${id} updated`,
      time: 5000,
    });
    getAllMgmtDomainsData();
    setMgmtUpdateModalOpen(false);
  };

  const handleMgmtAddModalOpen = (deviceA, deviceBCandidates) => {
    setMgmtAddModalInput({
      deviceA,
      deviceBCandidates,
    });
    setMgmtAddModalOpen(true);
  };

  const handleMgmtAddDomainModalClose = () => {
    setMgmtAddModalInput({});
    setMgmtAddModalOpen(false);
  };

  const handleMgmtUpdateModalOpen = ({
    id,
    device_a,
    device_b,
    ipv4_gw,
    ipv6_gw,
    vlan,
  }) => {
    setMgmtUpdateModalInput({
      mgmtId: id,
      deviceA: device_a,
      deviceB: device_b,
      ipv4Initial: ipv4_gw,
      ipv6Initial: ipv6_gw,
      vlanInitial: vlan,
    });
    setMgmtUpdateModalOpen(true);
  };

  const mgmtUpdateModalClose = () => {
    setMgmtUpdateModalInput({});
    setMgmtUpdateModalOpen(false);
  };

  const handleShowConfigModalOpen = (hostname, state) => {
    setShowConfigModalOpen(true);
    setShowConfigModalHostname(hostname);
    setShowConfigModalState(state);
  };

  const handleShowConfigModalClose = () => {
    setShowConfigModalOpen(false);
    setShowConfigModalHostname(null);
    setShowConfigModalState(null);
  };

  const getModel = (hostname) => {
    // loop through devicesData and return model for matching hostname
    const device = deviceData.find((element) => element.hostname === hostname);
    return device ? device.model : null;
  };

  const getNetboxModelData = async (hostname) => {
    const model = getModel(hostname);
    if (!process.env.NETBOX_API_URL) {
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

    // if this.state.netboxModelData map does not have an object for model, fetch data from netbox
    const mod = netboxModelData[model];
    if (mod) return mod;

    try {
      const data = await getFunc(
        `${url}/api/dcim/device-types/?part_number__ie=${model}`,
        credentials,
      );
      if (data.count === 1) {
        setNetboxModelData((prev) => ({
          ...prev,
          [model]: data.results.pop(),
        }));
      } else {
        console.log("no data found for model", model);
      }
    } catch (error) {
      console.log(error);
      // Do nothing
    }
  };

  const getNetboxDeviceData = async (hostname) => {
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

    const host = netboxDeviceData[hostname];
    if (host) return host;

    try {
      const data = await getFunc(
        `${url}/api/dcim/devices/?name__ie=${hostname}&tenant_id=${process.env.NETBOX_TENANT_ID}`,
        credentials,
      );

      if (data.count === 1) {
        setNetboxDeviceData((prev) => ({
          ...prev,
          [hostname]: data.results.pop(),
        }));
      } else {
        console.log("no data found device", hostname);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getInterfacesData = async (hostname) => {
    try {
      const data = await getData(
        `${process.env.API_URL}/api/v1.0/device/${hostname}/interfaces`,
        token,
      );

      // If interface data already exists return
      if (deviceInterfaceData[hostname]) return;

      setDeviceInterfaceData((prev) => {
        if (
          !Array.isArray(data.data.interfaces) ||
          !data.data.interfaces.length
        ) {
          return prev;
        }
        return {
          ...prev,
          [hostname]: data.data.interfaces,
        };
      });
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  };

  const checkJobId = (job_id) => {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${job_id}`);
    };
  };

  const renderMlagLink = (interfaceData) => {
    return interfaceData
      .filter((intf) => intf.configtype === "MLAG_PEER")
      .map((intf) => {
        return (
          <Button
            compact
            icon="exchange"
            key={intf.name}
            onClick={(e) => findAction(e, { id: intf.data.neighbor_id }, false)}
            title="Go to MLAG peer device"
            content={`${intf.name}: MLAG peer`}
          />
        );
      });
  };

  const renderUplinkLink = (interfaceData) => {
    return interfaceData
      .filter((intf) => intf.configtype === "ACCESS_UPLINK")
      .map((intf) => {
        return (
          <Button
            compact
            icon="arrow up"
            key={intf.name}
            onClick={(e) =>
              findAction(e, { hostname: intf.data.neighbor }, false)
            }
            title="Go to uplink device"
            content={`${intf.name}: Uplink to ${intf.data.neighbor}`}
          />
        );
      });
  };

  const getMgmgtDomainForDevice = (hostname) => {
    return mgmtDomainsData.filter(
      (data) => hostname === data.device_a || hostname === data.device_b,
    );
  };

  const renderMgmtDomainsButton = (device) => {
    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    const mgmtDomainForDevice = getMgmgtDomainForDevice(device.hostname);
    const isCorrectDeviceType = (dev) =>
      dev.device_type === "DIST" || (includeCore && dev.device_type === "CORE");
    const isNotInMgmgtDomain = (dev) =>
      !getMgmgtDomainForDevice(dev.hostname).length;
    if (!mgmtDomainForDevice.length) {
      const deviceBCandidates = deviceData
        .filter(isCorrectDeviceType)
        .filter(isNotInMgmgtDomain);
      return (
        <Button
          compact
          icon="plus"
          key={`${device.id}_mgmgt_add`}
          onClick={() =>
            handleMgmtAddModalOpen(device.hostname, deviceBCandidates)
          }
          content="Add management domain"
        />
      );
    }

    if (mgmtDomainForDevice.length > 1) {
      throw new Error("multiple mgmt domains for device");
    }

    return (
      <Button
        compact
        icon="arrow up"
        key={`${device.id}_mgmgt_add`}
        onClick={() => handleMgmtUpdateModalOpen(mgmtDomainForDevice[0])}
        content="Management domain"
      />
    );
  };

  const syncDeviceAction = (hostname) => {
    history.push(`config-change?hostname=${hostname}`);
  };

  const upgradeDeviceAction = (hostname) => {
    history.push(`firmware-upgrade?hostname=${hostname}`);
  };

  const configurePortsAction = (hostname) => {
    history.push(`interface-config?hostname=${hostname}`);
  };

  const updateFactsAction = async (hostname, device_id) => {
    console.log(`Update facts for hostname: ${hostname}`);

    const dataToSend = {
      hostname,
    };
    const data = await postData(
      `${process.env.API_URL}/api/v1.0/device_update_facts`,
      token,
      dataToSend,
    );

    if (data.job_id !== undefined && typeof data.job_id === "number") {
      addDeviceJob(device_id, data.job_id);
    } else {
      console.log("error when submitting device_update_facts job", data.job_id);
    }
  };

  const deleteDeviceFactoryDefaultAction = (event, data) => {
    setDeleteModalFactoryDefault(data.checked);
  };

  const handleDeleteModalOpen = (
    device_id,
    device_hostname,
    device_state,
    device_type,
  ) => {
    let factory_default = false;
    if (device_state == "MANAGED" && device_type == "ACCESS") {
      factory_default = true;
    }

    setDeleteModalOpen(true);
    setDeleteModalDeviceId(device_id);
    setDeleteModalDeviceHostname(device_hostname);
    setDeleteModalDeviceState(device_state);
    setDeleteModalDeviceType(device_type);
    setDeleteModalConfirmName("");
    setDeleteModalFactoryDefault(factory_default);
  };

  const deleteModalClose = () => {
    setDeleteModalOpen(false);
    setDeleteModalDeviceId(null);
    setDeleteModalDeviceHostname(null);
    setDeleteModalDeviceState(null);
    setDeleteModalDeviceType(null);
    setDeleteModalConfirmName("");
    setDeleteModalFactoryDefault(false);
    setDeleteModalError(null);
  };

  const deleteDeviceAction = () => {
    const url = `${process.env.API_URL}/api/v1.0/device/${deleteModalDeviceId}`;
    const dataToSend = {
      deleteModalFactoryDefault,
    };

    // TODO change to async
    deleteData(url, token, dataToSend)
      .then((data) => {
        if (data.job_id !== undefined && typeof data.job_id === "number") {
          addDeviceJob(deleteModalDeviceId, data.job_id);
          deleteModalClose();
        } else {
          deleteModalClose();
        }
      })
      .catch((error) => {
        console.log(error);
        if (typeof error.json === "function") {
          error
            .json()
            .then((jsonError) => {
              console.log(jsonError);

              setDeleteModalError(`JSON error from API: ${jsonError.message}`);
            })
            .catch(() => {
              console.log(error.statusText);

              setDeleteModalError(`Error from API: ${error.statusText}`);
            });
        } else {
          console.log(error);
          setDeleteModalError(`Fetch error: ${error}`);
        }
      });
  };

  const changeStateAction = async (device_id, state) => {
    console.log(`Change state for device_id: ${device_id}`);

    const url = `${process.env.API_URL}/api/v1.0/device/${device_id}`;
    const dataToSend = {
      state,
      synchronized: false,
    };
    const data = await putData(url, token, dataToSend);

    if (data.status !== "success") {
      console.log("error when updating state:", data.error);
    }
    getDevices();
  };

  const createMgmtIP = (mgmt_ip, key_prefix = "") => {
    const mgmtip = [];
    mgmtip.push(<i key={`${key_prefix}mgmt_ip`}>{mgmt_ip} </i>);
    mgmtip.push(
      <Button
        key={`${key_prefix}copy`}
        basic
        compact
        size="mini"
        icon="copy"
        title={mgmt_ip}
        onClick={() => {
          navigator.clipboard.writeText(mgmt_ip);
        }}
      />,
    );
    const isIPv6 = mgmt_ip.includes(":");
    const ssh_address = isIPv6 ? `ssh://[${mgmt_ip}]` : `ssh://${mgmt_ip}`;
    mgmtip.push(
      <Button
        key={`${key_prefix}ssh`}
        basic
        compact
        size="mini"
        icon="terminal"
        title={ssh_address}
        onClick={() => {
          window.location = ssh_address;
        }}
      />,
    );

    return mgmtip;
  };

  const createMenuActionsForDevice = (device) => {
    let menuActions = [
      <Dropdown.Item
        key="noaction"
        text="No actions allowed in this state"
        disabled
      />,
    ];
    if (device.state == "DHCP_BOOT") {
      menuActions = [
        <Dropdown.Item
          key="delete"
          text="Delete device..."
          onClick={() =>
            handleDeleteModalOpen(
              device.id,
              device.hostname,
              device.state,
              device.device_type,
            )
          }
        />,
      ];
    } else if (device.state == "DISCOVERED") {
      menuActions = [
        <Dropdown.Item
          key="delete"
          text="Delete device..."
          onClick={() =>
            handleDeleteModalOpen(
              device.id,
              device.hostname,
              device.state,
              device.device_type,
            )
          }
        />,
      ];
    } else if (device.state == "MANAGED") {
      menuActions = [
        <Dropdown.Item
          key="sync"
          text="Sync device..."
          onClick={() => syncDeviceAction(device.hostname)}
        />,
        <Dropdown.Item
          key="fwupgrade"
          text="Firmware upgrade..."
          onClick={() => upgradeDeviceAction(device.hostname)}
        />,
        <Dropdown.Item
          key="facts"
          text="Update facts"
          onClick={() => updateFactsAction(device.hostname, device.id)}
        />,
        <Dropdown.Item
          key="makeunmanaged"
          text="Make unmanaged"
          onClick={() => changeStateAction(device.id, "UNMANAGED")}
        />,
        <Dropdown.Item
          key="showconfig"
          text="Show configuration"
          onClick={() =>
            handleShowConfigModalOpen(device.hostname, device.state)
          }
        />,
        <Dropdown.Item
          key="delete"
          text="Delete device..."
          onClick={() =>
            handleDeleteModalOpen(
              device.id,
              device.hostname,
              device.state,
              device.device_type,
            )
          }
        />,
      ];
      if (
        device.device_type === "ACCESS" ||
        (device.device_type === "DIST" &&
          localStorage.getItem("distPortConfig") &&
          JSON.parse(localStorage.getItem("distPortConfig")) === true)
      ) {
        menuActions.push(
          <Dropdown.Item
            key="configports"
            text="Configure ports"
            onClick={() => configurePortsAction(device.hostname)}
          />,
        );
      }
    } else if (device.state == "UNMANAGED") {
      menuActions = [
        <Dropdown.Item
          key="facts"
          text="Update facts"
          onClick={() => updateFactsAction(device.hostname, device.id)}
        />,
        <Dropdown.Item
          key="makemanaged"
          text="Make managed"
          onClick={() => changeStateAction(device.id, "MANAGED")}
        />,
        <Dropdown.Item
          key="showconfig"
          text="Show configuration"
          onClick={() => showConfigModalOpen(device.hostname, device.state)}
        />,
        <Dropdown.Item
          key="delete"
          text="Delete device..."
          onClick={() =>
            handleDeleteModalOpen(
              device.id,
              device.hostname,
              device.state,
              device.device_type,
            )
          }
        />,
      ];
    }

    if (device?.deleted === true) {
      menuActions = [
        <Dropdown.Item
          key="noaction"
          text="No actions allowed for deleted device"
          disabled
        />,
      ];
    }

    return menuActions;
  };

  const createDeviceButtonsExtraForDevice = (device) => {
    const deviceButtons = [];

    if (device.hostname in deviceInterfaceData !== false) {
      const mlagPeerLink = renderMlagLink(deviceInterfaceData[device.hostname]);
      if (mlagPeerLink !== null) {
        deviceButtons.push.apply(deviceButtons, mlagPeerLink);
      }

      const uplinkLink = renderUplinkLink(deviceInterfaceData[device.hostname]);
      if (uplinkLink !== null) {
        deviceButtons.push.apply(deviceButtons, uplinkLink);
      }
    }

    const includeCore = process.env.MGMT_DOMAIN_CORE_ENABLED === "true";
    if (
      device.device_type === "DIST" ||
      (includeCore && device.device_type === "CORE")
    ) {
      deviceButtons.push(renderMgmtDomainsButton(device));
    }

    return deviceButtons;
  };

  const mangleDeviceData = (device) => {
    const deviceStateExtra = [];
    if (device.state == "DISCOVERED") {
      deviceStateExtra.push(
        <DeviceInitForm
          key={`${device.id}_initform`}
          deviceId={device.id}
          jobIdCallback={addDeviceJob}
        />,
      );
    } else if (device.state == "INIT") {
      if (device.id in deviceJobs) {
        deviceStateExtra.push(
          <p key="initjobs">Init jobs: {deviceJobs[device.id].join(", ")}</p>,
        );
      }
    }

    const deviceButtonsExtra = createDeviceButtonsExtraForDevice(device);
    if (deviceButtonsExtra.length > 0) {
      deviceStateExtra.push(
        <div key="btngroup">
          <Button.Group vertical labeled icon>
            {deviceButtonsExtra}
          </Button.Group>
        </div>,
      );
    }

    const log = {};
    for (const deviceId of Object.keys(deviceJobs)) {
      log[deviceId] = "";

      for (const jobId of deviceJobs[deviceId]) {
        const filteredLines = logLines.filter(checkJobId(jobId));

        for (const logLine of filteredLines) {
          log[deviceId] += logLine;

          const element = document.getElementById(
            `logoutputdiv_device_id_${deviceId}`,
          );

          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }
      }
    }

    const mgmtip = [];
    if (device.management_ip) {
      mgmtip.push(...createMgmtIP(device.management_ip));
    }
    if (device.secondary_management_ip) {
      mgmtip.push(
        ...createMgmtIP(device.secondary_management_ip, "secondary_"),
      );
    }
    if (device.dhcp_ip !== null) {
      mgmtip.push(<i key="dhcp_ip">(DHCP IP: {device.dhcp_ip})</i>);
    }
    let model = null;

    if (Object.hasOwn(netboxModelData, device.model)) {
      model = netboxModelData[device.model];
    }

    let netboxDevice = null;

    if (Object.hasOwn(netboxDeviceData, device.hostname)) {
      netboxDevice = netboxDeviceData[device.hostname];
    }

    return (
      <DeviceInfoBlock
        key={`${device.id}_device_info`}
        device={device}
        menuActions={createMenuActionsForDevice(device)}
        mgmtip={mgmtip}
        deviceStateExtra={deviceStateExtra}
        log={log}
        model={model}
        netboxDevice={netboxDevice}
      />
    );
  };

  const columnSelectorChange = (column) => {
    setActiveColumns((prev) => {
      const newColumns = prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column];

      return newColumns.sort(
        (a, b) =>
          Object.keys(columnMap).indexOf(a) - Object.keys(columnMap).indexOf(b),
      );
    });
  };

  const discoveredDeviceIdsRef = useRef(discoveredDeviceIds);

  useEffect(() => {
    discoveredDeviceIdsRef.current = discoveredDeviceIds;
  }, [discoveredDeviceIds]);

  useEffect(() => {
    socket = io(process.env.API_URL, { query: { jwt: token } });
    socket.on("connect", function () {
      console.log("Websocket connected!");
      socket.emit("events", { update: "device" });
      socket.emit("events", { update: "job" });
      socket.emit("events", { loglevel: "DEBUG" });
    });
    socket.on("events", (data) => {
      // device update event
      if (data.device_id !== undefined) {
        if (data.action == "UPDATED") {
          if (data.object.state == "DISCOVERED") {
            if (
              data.device_id !== undefined &&
              data.device_id !== null &&
              !discoveredDeviceIdsRef.current.has(data.device_id)
            ) {
              toast({
                type: "info",
                icon: "paper plane",
                title: `Device discovered: ${data.hostname} `,
                description: (
                  <p>
                    Model: {data.object.model}, Serial: {data.object.serial}
                    <br />
                    <Button
                      basic
                      compact
                      onClick={(e) =>
                        findAction(e, { id: data.device_id }, true)
                      }
                    >
                      Go to device
                    </Button>
                  </p>
                ),
                animation: "bounce",
                time: 0,
              });
              discoveredDeviceIdsRef.current.add(data.device_id);
            }
          }
          setDeviceData((prev) =>
            prev.map((dev) => (dev.id === data.device_id ? data.object : dev)),
          );
        } else if (data.action == "DELETED") {
          setDeviceData((prev) =>
            prev.filter((dev) => dev.id !== data.device_id),
          );
          // If filter is on the current device id set filter to nothing and refetch data
          setFilterData((prev) => {
            if (prev.id === data.device_id) {
              setFilterActive(false);
              setSortColumn(null);
              setSortDirection(null);
              return {};
            }
            return prev;
          });
        } else if (data.action == "CREATED") {
          if (data.device_id !== undefined && data.device_id !== null) {
            toast({
              type: "info",
              icon: "paper plane",
              title: `Device added: ${data.hostname}`,
              description: (
                <p>
                  State: {data.object.state}
                  <br />
                  <Button
                    basic
                    compact
                    onClick={(e) => findAction(e, { id: data.device_id }, true)}
                  >
                    Go to device
                  </Button>
                </p>
              ),
              animation: "bounce",
              time: 0,
            });
          }
        }
        // job update event
      } else if (data.job_id !== undefined) {
        setLogLines((prev) => [
          ...prev,
          data.status === "EXCEPTION"
            ? `job #${data.job_id} changed status to ${data.status}: ${data.exception}\n`
            : `job #${data.job_id} changed status to ${data.status}\n`,
        ]);

        // if finished && next_job id, push next_job_id to array

        if (typeof data.next_job_id === "number") {
          setDeviceJobs((prev) => {
            const newDeviceInitJobs = {};

            for (const deviceId of Object.keys(prev)) {
              if (prev[deviceId][0] === data.job_id) {
                newDeviceInitJobs[deviceId] = [data.job_id, data.next_job_id];
              } else {
                newDeviceInitJobs[deviceId] = prev[deviceId];
              }
            }

            return newDeviceInitJobs;
          });
        }

        // log events
      } else if (typeof data === "string" || data instanceof String) {
        setLogLines((prev) => {
          const updated = [...prev, `${data}\n`];
          if (updated.length > 1000) {
            updated.shift(); // remove oldest
          }
          return updated;
        });
      }
    });

    return () => {
      // This runs on unmount
      socket.off("events");
    };
  }, []);

  const getAdditionalDeviceData = (hostname) => {
    getInterfacesData(hostname);
    getNetboxModelData(hostname);
    getNetboxDeviceData(hostname);
  };

  return (
    <section>
      <Grid divided="vertically">
        <GridRow columns={2}>
          <GridColumn>
            <h2>Devices</h2>
          </GridColumn>
          <GridColumn textAlign="right" verticalAlign="bottom">
            <DeviceTableButtonGroup
              activeColumns={activeColumns}
              setFilterActive={setFilterActive}
              setFilterData={setFilterData}
              columnSelectorChange={columnSelectorChange}
              resultsPerPage={resultsPerPage}
              setActivePage={setActivePage}
              setResultsPerPage={setResultsPerPage}
              setSortColumn={setSortColumn}
              setSortDirection={setSortDirection}
            />
          </GridColumn>
        </GridRow>
      </Grid>
      <SemanticToastContainer position="top-right" maxToasts={3} />
      <Modal onClose={() => deleteModalClose()} open={deleteModalOpen}>
        <Modal.Header>Delete device {deleteModalDeviceHostname}</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <p key="confirm">
              Are you sure you want to delete device {deleteModalDeviceHostname}{" "}
              with device ID {deleteModalDeviceId}? Confirm hostname below to
              delete
            </p>
            <p key="error" hidden={deleteModalError === null}>
              Error deleting device: {deleteModalError}
            </p>
            <Input
              placeholder="confirm hostname"
              onChange={(e) => setDeleteModalConfirmName(e.target.value)}
            />
            <Checkbox
              label="Reset device to factory default settings when deleting"
              name="factory_default"
              checked={deleteModalFactoryDefault}
              disabled={
                deleteModalDeviceState != "MANAGED" ||
                deleteModalDeviceType != "ACCESS"
              }
              onChange={deleteDeviceFactoryDefaultAction}
            />
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button
            key="cancel"
            color="black"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            key="submit"
            disabled={deleteModalDeviceHostname != deleteModalConfirmName}
            onClick={() => deleteDeviceAction()}
            icon
            labelPosition="right"
            negative
          >
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
      <AddMgmtDomainModal
        {...mgmtAddModalInput}
        isOpen={mgmtAddModalOpen}
        closeAction={() => handleMgmtAddDomainModalClose()}
        onAdd={(v) => handleAddMgmtDomains(v)}
      />
      <UpdateMgmtDomainModal
        {...mgmtUpdateModalInput}
        isOpen={mgmtUpdateModalOpen}
        closeAction={() => mgmtUpdateModalClose()}
        onDelete={(v) => handleDeleteMgmtDomain(v)}
        onUpdate={(v) => handleUpdateMgmtDomains(v)}
      />
      <ShowConfigModal
        hostname={showConfigModalHostname}
        state={showConfigModalState}
        isOpen={showConfigModalOpen}
        closeAction={() => handleShowConfigModalClose()}
      />
      <Table sortable celled striped>
        <DeviceTableHeader
          activeColumns={activeColumns}
          columnMap={columnMap}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          filterActive={filterActive}
          filterData={filterData}
          sortClick={sortClick}
          handleFilterChange={handleFilterChange}
        />
        <DeviceTableBody
          deviceData={deviceData}
          activeColumns={activeColumns}
          loading={loading}
          error={error}
          defaultOpen={expandResult}
          mangleDeviceData={mangleDeviceData}
          getAdditionalDeviceData={getAdditionalDeviceData}
        />
      </Table>
      <Pagination
        activePage={activePage}
        totalPages={totalPages}
        boundaryRange={5}
        onPageChange={(e, { activePage }) => setActivePage(activePage)}
      />
    </section>
  );
}

export default DeviceList;
