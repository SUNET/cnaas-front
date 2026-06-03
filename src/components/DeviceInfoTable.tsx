import {
  Button,
  Popup,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "semantic-ui-react";
import { formatISODate } from "../utils/formatters";
import { toNetboxDevice } from "../api/netboxApi";
import type { Device } from "../types/device";

// --- File-local Netbox model shape ----------------------------------------
// `model` arrives as loosely-typed `unknown` (the Netbox API returns
// `Record<string, unknown>`). Narrow the subset of fields the table reads
// here, at the boundary, so the JSX accesses typed fields without `as`.
// The device shape + guard live alongside the fetcher in `api/netboxApi`.

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

type NetboxModelInfo = {
  readonly display_url?: string;
  readonly front_image?: string;
  readonly description?: string;
  readonly interface_template_count?: number;
};

function toNetboxModelInfo(value: unknown): NetboxModelInfo | null {
  if (!isRecord(value)) return null;
  return {
    display_url:
      typeof value.display_url === "string" ? value.display_url : undefined,
    front_image:
      typeof value.front_image === "string" ? value.front_image : undefined,
    description:
      typeof value.description === "string" ? value.description : undefined,
    interface_template_count:
      typeof value.interface_template_count === "number"
        ? value.interface_template_count
        : undefined,
  };
}

function ManagementIP({
  ip,
  keyPrefix = "",
}: {
  readonly ip: string | null;
  readonly keyPrefix?: string;
}) {
  if (!ip) return null;

  const isIPv6 = ip.includes(":");
  const sshAddress = isIPv6 ? `ssh://[${ip}]` : `ssh://${ip}`;

  return (
    <>
      <span key={`${keyPrefix}mgmt_ip`}>{ip} </span>
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
          globalThis.location.href = sshAddress;
        }}
      />
    </>
  );
}

function ModelField({
  device,
  model,
}: {
  readonly device: Device;
  readonly model: unknown;
}) {
  const info = toNetboxModelInfo(model);
  if (!info) return device.model;

  const content = [
    <a key="header" href={info.display_url}>
      <h3>Netbox model info</h3>
    </a>,
  ];
  if (info.front_image) {
    content.push(
      <img
        key="front"
        src={info.front_image}
        alt="Device front"
        width="100%"
      />,
    );
  }
  if (info.description) {
    content.push(<p key="description">{info.description}</p>);
  }
  if (info.interface_template_count) {
    content.push(
      <p key="interfaces">{info.interface_template_count} interfaces</p>,
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

function NetboxRows({ netboxDevice }: { readonly netboxDevice: unknown }) {
  const info = toNetboxDevice(netboxDevice);
  if (!info) return null;

  const rows = [];

  let monitoringLink = null;
  if (info.status.label === "Active" && process.env.MONITORING_WEB_URL) {
    monitoringLink = [
      <span key="monitoring_link_pre"> (</span>,
      <a
        key="monitoring_link"
        href={`${process.env.MONITORING_WEB_URL}/ipdevinfo/${info.name}/`}
        title="Go to device in in monitoring system"
      >
        Monitoring
      </a>,
      <span key="monitoring_link_post">)</span>,
    ];
  }
  rows.push(
    <TableRow key="netbox_status">
      <TableCell key="name">Netbox Status</TableCell>
      <TableCell key="value">
        <p>
          <a href={info.display_url} title="Go to device in Netbox">
            {info.status.label}
          </a>
          {monitoringLink}
        </p>
      </TableCell>
    </TableRow>,
  );

  if (info.location || info.site) {
    const locationParts = [];
    if (info.site) {
      locationParts.push(
        <a
          key="site"
          href={info.site.url.replace("/api", "")}
          title="Go to site in Netbox"
        >
          {info.site.name}
        </a>,
      );
    }
    if (info.location) {
      locationParts.push(
        <a
          key="location"
          href={info.location.url.replace("/api", "")}
          title="Go to location in Netbox"
        >
          {info.location.name}
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
          <span>{locationParts}</span>
        </TableCell>
      </TableRow>,
    );
  }

  if (info.asset_tag) {
    rows.push(
      <TableRow key="netbox_assettag">
        <TableCell key="name">Netbox Asset Tag</TableCell>
        <TableCell key="value">{info.asset_tag}</TableCell>
      </TableRow>,
    );
  }

  return rows;
}

export function DeviceInfoTable({
  device,
  model,
  netboxDevice,
}: {
  readonly device: Device;
  readonly model?: unknown;
  readonly netboxDevice?: unknown;
}) {
  return (
    <Table compact>
      <TableBody>
        <TableRow key="detail_hostname">
          <TableCell key="name">Hostname</TableCell>
          <TableCell key="value">{device.hostname}</TableCell>
        </TableRow>
        <TableRow key="detail_mgmtip">
          <TableCell key="name">Management IP</TableCell>
          <TableCell key="value">
            <ManagementIP ip={device.management_ip} />
            <ManagementIP
              ip={device.secondary_management_ip}
              keyPrefix="secondary_"
            />
            {device.dhcp_ip != null && (
              <span key="dhcp_ip">(DHCP IP: {device.dhcp_ip})</span>
            )}
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
