import PropTypes from "prop-types";
import {
  Button,
  Popup,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "semantic-ui-react";
import { formatISODate } from "../utils/formatters";

function ManagementIP({ ip, keyPrefix = "" }) {
  if (!ip) return null;

  const isIPv6 = ip.includes(":");
  const sshAddress = isIPv6 ? `ssh://[${ip}]` : `ssh://${ip}`;

  return (
    <>
      <i key={`${keyPrefix}mgmt_ip`}>{ip} </i>
      <Button
        key={`${keyPrefix}copy`}
        basic
        compact
        size="mini"
        icon="copy"
        title={ip}
        onClick={() => {
          navigator.clipboard.writeText(ip);
        }}
      />
      <Button
        key={`${keyPrefix}ssh`}
        basic
        compact
        size="mini"
        icon="terminal"
        title={sshAddress}
        onClick={() => {
          globalThis.location = sshAddress;
        }}
      />
    </>
  );
}

ManagementIP.propTypes = {
  ip: PropTypes.string,
  keyPrefix: PropTypes.string,
};

function ModelField({ device, model }) {
  if (!model) return device.model;

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

  return (
    <Popup
      content={<>{content}</>}
      wide="very"
      hoverable
      trigger={<span className="popup-trigger">{device.model}</span>}
    />
  );
}

ModelField.propTypes = {
  device: PropTypes.object.isRequired,
  model: PropTypes.object,
};

function NetboxRows({ netboxDevice }) {
  if (!netboxDevice) return null;

  const rows = [];

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
  rows.push(
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
    rows.push(
      <TableRow key="netbox_location">
        <TableCell key="name">Netbox Location</TableCell>
        <TableCell key="value">
          <div>{locationParts}</div>
        </TableCell>
      </TableRow>,
    );
  }

  if (netboxDevice.asset_tag) {
    rows.push(
      <TableRow key="netbox_assettag">
        <TableCell key="name">Netbox Asset Tag</TableCell>
        <TableCell key="value">{netboxDevice.asset_tag}</TableCell>
      </TableRow>,
    );
  }

  return rows;
}

NetboxRows.propTypes = {
  netboxDevice: PropTypes.object,
};

export function DeviceInfoTable({ device, model, netboxDevice }) {
  return (
    <Table compact>
      <TableBody>
        <TableRow key="detail_hostname">
          <TableCell key="name">Hostname</TableCell>
          <TableCell key="value">
            <div>{device.hostname}</div>
          </TableCell>
        </TableRow>
        <TableRow key="detail_mgmtip">
          <TableCell key="name">Management IP</TableCell>
          <TableCell key="value">
            <div>
              <ManagementIP ip={device.management_ip} />
              <ManagementIP
                ip={device.secondary_management_ip}
                keyPrefix="secondary_"
              />
              {device.dhcp_ip != null && (
                <i key="dhcp_ip">(DHCP IP: {device.dhcp_ip})</i>
              )}
            </div>
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
          <TableCell key="value">
            <ModelField device={device} model={model} />
          </TableCell>
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
          <TableCell key="value">{formatISODate(device.last_seen)}</TableCell>
        </TableRow>
        <NetboxRows netboxDevice={netboxDevice} />
      </TableBody>
    </Table>
  );
}

DeviceInfoTable.propTypes = {
  device: PropTypes.object.isRequired,
  model: PropTypes.object,
  netboxDevice: PropTypes.object,
};
