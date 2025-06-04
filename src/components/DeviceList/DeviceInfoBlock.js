import { Dropdown, Icon, Popup } from "semantic-ui-react";
import { usePermissions } from "../../contexts/PermissionsContext";
import { formatISODate } from "../../utils/formatters";

export default function DeviceInfoBlock({
  device,
  hostnameExtra,
  syncStatus,
  columnData,
  clickRow,
  colLength,
  menuActions,
  mgmtip,
  deviceStateExtra,
  deviceInterfaceData,
  log,
  model,
  netboxDevice,
}) {
  const { permissionsCheck } = usePermissions();

  function toggleHidden(target) {
    const closestTrParent = target.closest("tr");
    const isHidden = closestTrParent.nextElementSibling.hidden;
    if (isHidden) {
      closestTrParent.nextElementSibling.hidden = false;
      try {
        closestTrParent.firstElementChild.firstElementChild.className =
          "angle down icon";
        return closestTrParent.id;
      } catch (error) {
        console.log("Could not change icon for expanded row");
      }
    } else {
      closestTrParent.nextElementSibling.hidden = true;
      try {
        closestTrParent.firstElementChild.firstElementChild.className =
          "angle right icon";
      } catch (error) {
        console.log("Could not change icon for collapsed row");
      }
    }

    return undefined;
  }

  function handleClick(e) {
    const expandedId = toggleHidden(e.target);
    if (expandedId) {
      clickRow(expandedId);
    }
  }

  let modelField = device.model;
  if (model) {
    const content = [
      <a key="header" href={model.display_url}>
        <h3>Netbox model info</h3>
      </a>,
    ];
    if (model.front_image) {
      content.push(
        <img
          key="front"
          src={model.front_image}
          alt="Device front"
          width="100%"
        />,
      );
    }
    if (model.description) {
      content.push(<p key="description">{model.description}</p>);
    }
    if (model.interface_template_count) {
      content.push(
        <p key="interfaces">{model.interface_template_count} interfaces</p>,
      );
    }
    modelField = (
      <Popup
        key="modeldetail"
        content={<>{content}</>}
        wide="very"
        hoverable
        trigger={<a>{device.model}</a>}
      />
    );
  }

  const netboxRows = [];
  if (netboxDevice) {
    let monitoringLink = null;
    if (
      netboxDevice.status.label === "Active" &&
      process.env.MONITORING_WEB_URL
    ) {
      monitoringLink = [
        <i key="monitoring_link_pre"> (</i>,
        <a
          key="monitoring_link"
          href={`${process.env.MONITORING_WEB_URL}/ipdevinfo/${netboxDevice.name}/`}
          title="Go to device in in monitoring system"
        >
          Monitoring
        </a>,
        <i key="monitoring_link_post">)</i>,
      ];
    }
    netboxRows.push(
      <tr key="netbox_status">
        <td key="name">Netbox Status</td>
        <td key="value">
          <p>
            <a href={netboxDevice.display_url} title="Go to device in Netbox">
              {netboxDevice.status.label}
            </a>
            {monitoringLink}
          </p>
        </td>
      </tr>,
    );
    if (netboxDevice.location || netboxDevice.site) {
      const locationParts = [];
      if (netboxDevice.site) {
        locationParts.push(
          <a
            key="site"
            href={netboxDevice.site.url.replace("/api", "")}
            title="Go to site in Netbox"
          >
            {netboxDevice.site.name}
          </a>,
        );
      }
      if (netboxDevice.location) {
        locationParts.push(
          <a
            key="location"
            href={netboxDevice.location.url.replace("/api", "")}
            title="Go to location in Netbox"
          >
            {netboxDevice.location.name}
          </a>,
        );
      }
      if (locationParts.length === 2) {
        locationParts.splice(1, 0, <span key="separator"> {"->"} </span>);
      }
      netboxRows.push(
        <tr key="netbox_location">
          <td key="name">Netbox Location</td>
          <td key="value">
            <div>{locationParts}</div>
          </td>
        </tr>,
      );
    }
  }

  return [
    <tr id={device.hostname} key={`${device.id}_row`} onClick={handleClick}>
      <td key={`${device.id}_hostname`}>
        <Icon name="angle right" />
        {device.hostname}
        {hostnameExtra}
      </td>
      <td key={`${device.id}_device_type`}>{device.device_type}</td>
      {syncStatus}
      {columnData}
      <td key={`${device.id}_id`}>{device.id}</td>
    </tr>,
    <tr
      key={`${device.id}_content`}
      colSpan={4 + colLength}
      className="device_details_row"
      hidden
    >
      <td key="content_data">
        <div hidden={!permissionsCheck("Devices", "write")}>
          <Dropdown text="Actions" button>
            <Dropdown.Menu>{menuActions}</Dropdown.Menu>
          </Dropdown>
        </div>
        <table className="device_details_table">
          <tbody>
            <tr key="detail_mgmtip">
              <td key="name">Management IP</td>
              <td key="value">
                <div>{mgmtip}</div>
              </td>
            </tr>
            <tr key="detail_infraip">
              <td key="name">Infra IP</td>
              <td key="value">{device.infra_ip}</td>
            </tr>
            <tr key="detail_mac">
              <td key="name">MAC</td>
              <td key="value">{device.ztp_mac}</td>
            </tr>
            <tr key="detail_vendor">
              <td key="name">Vendor</td>
              <td key="value">{device.vendor}</td>
            </tr>
            <tr key="detail_model">
              <td key="name">Model</td>
              <td key="value">{modelField}</td>
            </tr>
            <tr key="detail_osversion">
              <td key="name">OS Version</td>
              <td key="value">{device.os_version}</td>
            </tr>
            <tr key="detail_serial">
              <td key="name">Serial</td>
              <td key="value">{device.serial}</td>
            </tr>
            <tr key="detail_state">
              <td key="name">State</td>
              <td key="value">{device.state}</td>
            </tr>
            <tr key="primary_group">
              <td key="name">Primary group</td>
              <td key="value">{device.primary_group}</td>
            </tr>
            <tr key="seen">
              <td key="name">Last seen</td>
              <td key="value">{formatISODate(device.last_seen)}</td>
            </tr>
            {netboxRows}
          </tbody>
        </table>
        {deviceStateExtra}
        {deviceInterfaceData}
        <div id={`logoutputdiv_device_id_${device.id}`} className="logoutput">
          <pre>{log[device.id]}</pre>
        </div>
      </td>
    </tr>,
  ];
}
