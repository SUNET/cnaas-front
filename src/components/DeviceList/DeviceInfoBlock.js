import {
  Dropdown,
  Grid,
  GridColumn,
  GridRow,
  Popup,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "semantic-ui-react";
import { usePermissions } from "../../contexts/PermissionsContext";
import { formatISODate } from "../../utils/formatters";

export default function DeviceInfoBlock({
  device,
  menuActions,
  mgmtip,
  deviceStateExtra,
  deviceInterfaceData,
  log,
  model,
  netboxDevice,
}) {
  const { permissionsCheck } = usePermissions();

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
      <TableRow key="netbox_status">
        <TableCell key="name">Netbox Status</TableCell>
        <TableCell key="value">
          <p>
            <a href={netboxDevice.display_url} title="Go to device in Netbox">
              {netboxDevice.status.label}
            </a>
            {monitoringLink}
          </p>
        </TableCell>
      </TableRow>,
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
        <TableRow key="netbox_location">
          <TableCell key="name">Netbox Location</TableCell>
          <TableCell key="value">
            <div>{locationParts}</div>
          </TableCell>
        </TableRow>,
      );
    }
  }

  return (
    <>
      <Grid columns={2}>
        <GridRow>
          <GridColumn>
            <div hidden={!permissionsCheck("Devices", "write")}>
              <Dropdown text="Actions" button>
                <Dropdown.Menu>{menuActions}</Dropdown.Menu>
              </Dropdown>
            </div>
            <Table compact>
              <TableBody>
                <TableRow key="detail_mgmtip">
                  <TableCell key="name">Management IP</TableCell>
                  <TableCell key="value">
                    <div>{mgmtip}</div>
                  </TableCell>
                </TableRow>
                <TableRow key="detail_infraip">
                  <TableCell key="name">Infra IP</TableCell>
                  <TableCell key="value">{device.infra_ip}</TableCell>
                </TableRow>
                <TableRow key="detail_mac">
                  <TableCell key="name">MAC</TableCell>
                  <TableCell key="value">{device.ztp_mac}</TableCell>
                </TableRow>
                <TableRow key="detail_vendor">
                  <TableCell key="name">Vendor</TableCell>
                  <TableCell key="value">{device.vendor}</TableCell>
                </TableRow>
                <TableRow key="detail_model">
                  <TableCell key="name">Model</TableCell>
                  <TableCell key="value">{modelField}</TableCell>
                </TableRow>
                <TableRow key="detail_osversion">
                  <TableCell key="name">OS Version</TableCell>
                  <TableCell key="value">{device.os_version}</TableCell>
                </TableRow>
                <TableRow key="detail_serial">
                  <TableCell key="name">Serial</TableCell>
                  <TableCell key="value">{device.serial}</TableCell>
                </TableRow>
                <TableRow key="detail_state">
                  <TableCell key="name">State</TableCell>
                  <TableCell key="value">{device.state}</TableCell>
                </TableRow>
                <TableRow key="primary_group">
                  <TableCell key="name">Primary group</TableCell>
                  <TableCell key="value">{device.primary_group}</TableCell>
                </TableRow>
                <TableRow key="seen">
                  <TableCell key="name">Last seen</TableCell>
                  <TableCell key="value">
                    {formatISODate(device.last_seen)}
                  </TableCell>
                </TableRow>
                {netboxRows}
              </TableBody>
            </Table>
          </GridColumn>
        </GridRow>
        <GridRow style={{ paddingTop: 0, paddingBottom: 0 }}>
          <GridColumn width={16}>
            {deviceStateExtra}
            {deviceInterfaceData}
          </GridColumn>
        </GridRow>
        {(!log[device.id] || log[device.id]?.length !== 0) && (
          <GridRow style={{ overflow: "hidden" }}>
            <GridColumn width={16}>
              <div
                id={`logoutputdiv_device_id_${device.id}`}
                className="logoutput"
                style={{ margin: 0, overflow: "auto" }}
              >
                <pre style={{ width: "1em" }}>{log[device.id]}</pre>
              </div>
            </GridColumn>
          </GridRow>
        )}
      </Grid>
    </>
  );
}
