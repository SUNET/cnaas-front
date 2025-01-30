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
      <a href={model.display_url}>
        <h3 key="header">Netbox model info</h3>
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
