import { formatISODate } from "../utils/formatters";
import { toNetboxDevice, toNetboxModel } from "../api/netboxApi";
import type { Device } from "../types/device";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import { NmsTooltip } from "./NmsTooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TerminalIcon from "@mui/icons-material/Terminal";
import { styled } from "@mui/material/styles";

const StripedTable = styled(Table)(() => ({
  "& tbody tr:nth-of-type(even)": {
    backgroundColor: "var(--color-surface)",
  },
}));

const TableContainerBordered = styled(TableContainer)(() => ({
  border: "1px solid var(--color-divider)",
}));

function ManagementIP({ ip }: { readonly ip: string | null }) {
  if (!ip) return null;

  const isIPv6 = ip.includes(":");
  const sshAddress = isIPv6 ? `ssh://[${ip}]` : `ssh://${ip}`;

  return (
    <>
      <span> {ip} </span>
      <IconButton
        size="small"
        title={ip}
        onClick={() => {
          navigator.clipboard.writeText(ip);
        }}
      >
        <ContentCopyIcon />
      </IconButton>
      <IconButton
        size="small"
        title={sshAddress}
        onClick={() => {
          globalThis.location.href = sshAddress;
        }}
      >
        <TerminalIcon />
      </IconButton>
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
  const info = toNetboxModel(model);
  if (!info) return device.model;

  return (
    <NmsTooltip
      title={
        <>
          <a key="header" href={info.display_url}>
            <h3>Netbox model info</h3>
          </a>
          {info.front_image && (
            <img
              key="front"
              src={info.front_image}
              alt="Device front"
              width="100%"
            />
          )}
          {info.description && <p key="description">{info.description}</p>}
          {info.interface_template_count && (
            <p key="interfaces">{info.interface_template_count} interfaces</p>
          )}
        </>
      }
    >
      <span className="popup-trigger">{device.model}</span>
    </NmsTooltip>
  );
}

function NetboxRows({ netboxDevice }: { readonly netboxDevice: unknown }) {
  const info = toNetboxDevice(netboxDevice);
  if (!info) return null;

  const monitoringLink =
    info.status.label === "Active" && process.env.MONITORING_WEB_URL ? (
      <>
        {"("}
        <a
          key="monitoring_link"
          href={`${process.env.MONITORING_WEB_URL}/ipdevinfo/${info.name}/`}
          title="Go to device in in monitoring system"
        >
          {" "}
          Monitoring{" "}
        </a>
        {")"}
      </>
    ) : null;

  const locationParts = (
    <>
      {info.site && (
        <a
          key="site"
          href={info.site.url.replace("/api", "")}
          title="Go to site in Netbox"
        >
          {info.site.name}
        </a>
      )}
      {info.location && (
        <>
          {info.site && <span> {"->"} </span>}
          <a
            href={info.location.url.replace("/api", "")}
            title="Go to location in Netbox"
          >
            {info.location.name}
          </a>
        </>
      )}
    </>
  );

  return (
    <>
      <TableRow key="row_netbox_status">
        <TableCell key="netbox_status">Netbox Status</TableCell>
        <TableCell key="netbox_status_value">
          <p>
            <a href={info.display_url} title="Go to device in Netbox">
              {info.status.label}
            </a>
            {monitoringLink}
          </p>
        </TableCell>
      </TableRow>
      {locationParts && (
        <TableRow key="netbox_location">
          <TableCell key="netbox_location">Netbox Location</TableCell>
          <TableCell key="netbox_location_value">
            <span>{locationParts}</span>
          </TableCell>
        </TableRow>
      )}
      {info.asset_tag && (
        <TableRow key="netbox_assettag">
          <TableCell key="netbox_asset">Netbox Asset Tag</TableCell>
          <TableCell key="netbox_asset_value">{info.asset_tag}</TableCell>
        </TableRow>
      )}
    </>
  );
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
    <TableContainerBordered>
      <StripedTable size="small" aria-label="Device info table">
        <TableBody>
          <TableRow key="row_hostname">
            <TableCell key="hostname">Hostname</TableCell>
            <TableCell key="hostname_value">{device.hostname}</TableCell>
          </TableRow>
          <TableRow key="row_mgmtip">
            <TableCell key="mgmtip">Management IP</TableCell>
            <TableCell key="mgmtip_value">
              <ManagementIP key="mgmt_ip" ip={device.management_ip} />
              <ManagementIP
                key="secondary_mgmt_ip"
                ip={device.secondary_management_ip}
              />
              {device.dhcp_ip && (
                <span key="dhcp_ip">(DHCP IP: {device.dhcp_ip})</span>
              )}
            </TableCell>
          </TableRow>
          <TableRow key="row_infraip">
            <TableCell key="infraip">Infra IP</TableCell>
            <TableCell key="infraip_value">{device.infra_ip}</TableCell>
          </TableRow>
          <TableRow key="row_ztp_mac">
            <TableCell key="ztp_mac">MAC</TableCell>
            <TableCell key="ztp_mac_value">{device.ztp_mac}</TableCell>
          </TableRow>
          <TableRow key="row_vendor">
            <TableCell key="vendor">Vendor</TableCell>
            <TableCell key="vendor_value">{device.vendor}</TableCell>
          </TableRow>
          <TableRow key="row_model">
            <TableCell key="model">Model</TableCell>
            <TableCell key="model_value">
              <ModelField device={device} model={model} />
            </TableCell>
          </TableRow>
          <TableRow key="row_osversion">
            <TableCell key="osversion">OS Version</TableCell>
            <TableCell key="osversion_value">{device.os_version}</TableCell>
          </TableRow>
          <TableRow key="row_serial">
            <TableCell key="serial">Serial</TableCell>
            <TableCell key="serial_value">{device.serial}</TableCell>
          </TableRow>
          <TableRow key="row_state">
            <TableCell key="state">State</TableCell>
            <TableCell key="state_value">{device.state}</TableCell>
          </TableRow>
          <TableRow key="row_primary_group">
            <TableCell key="primary_group">Primary group</TableCell>
            <TableCell key="primary_group_value">
              {device.primary_group}
            </TableCell>
          </TableRow>
          <TableRow key="row_seen">
            <TableCell key="seen">Last seen</TableCell>
            <TableCell key="seen_value">
              {formatISODate(device.last_seen)}
            </TableCell>
          </TableRow>
          <NetboxRows netboxDevice={netboxDevice} />
        </TableBody>
      </StripedTable>
    </TableContainerBordered>
  );
}
