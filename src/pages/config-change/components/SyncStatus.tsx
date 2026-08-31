import { useState, type ReactNode } from "react";
import { Table, Icon } from "semantic-ui-react";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { formatISODate } from "../../../utils/formatters";
import type { SyncEvent, SyncHistory } from "../../../types/syncHistory";
import type {
  CommitTarget,
  SyncTargetDevice,
} from "../stores/configChangeReducer";

type FormattedSyncEvent = {
  readonly cause: string;
  readonly by: string;
  readonly date: string;
};

function NoEventsContent() {
  return (
    <p key="no_events">
      No known synchronization events (old events are not persistent across
      server reboots)
    </p>
  );
}

type CauseColumn = {
  readonly cause: string;
  readonly devices: ReactNode;
};

type EventsTableProps = {
  readonly columns: CauseColumn[];
};

function EventsTable({ columns }: EventsTableProps) {
  return (
    <div key="tablecontainer" className="tablecontainer">
      <Table key="synceventlist" celled collapsing>
        <Table.Header>
          <Table.Row>
            {columns.map(({ cause }) => (
              <Table.HeaderCell key={cause}>{cause}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          <Table.Row>
            {columns.map(({ cause, devices }) => (
              <Table.Cell key={cause}>
                <ul>{devices}</ul>
              </Table.Cell>
            ))}
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  );
}

type DeviceEntryProps = {
  readonly hostname: string;
  readonly eventList: FormattedSyncEvent[];
};

function DeviceEntry({ hostname, eventList }: DeviceEntryProps) {
  return (
    <li key={hostname}>
      <Tooltip
        title={
          <ul key={`device_entry_${hostname}`}>
            {eventList.map((item) => (
              <li key={`${hostname}_${item.cause}_${item.by}_${item.date}`}>
                {item.cause} by {item.by} at {item.date}
              </li>
            ))}
          </ul>
        }
        slotProps={{ tooltip: { sx: { maxWidth: "none" } } }}
      >
        <span className="popup-trigger">
          {hostname} ({eventList.length})
        </span>
      </Tooltip>
    </li>
  );
}

function getCauses(devices: SyncTargetDevice[], synchistory: SyncHistory) {
  if (!synchistory || !devices.length) {
    return {};
  }

  const byCause: Record<string, ReactNode[]> = {};
  const causeTypes = new Set<string>();

  devices.forEach((device) => {
    const events = synchistory[device.hostname];
    if (events) {
      const deviceCauses = new Set<string>();
      const eventList = events.map((e: SyncEvent) => {
        if (!causeTypes.has(e.cause)) {
          byCause[e.cause] = [];
          causeTypes.add(e.cause);
        }
        const timestamp = new Date();
        timestamp.setTime(e.timestamp * 1000);
        deviceCauses.add(e.cause);

        return {
          cause: e.cause,
          by: e.by,
          date: formatISODate(timestamp.toISOString()),
        };
      });

      const deviceEntry = (
        <DeviceEntry
          key={`device_${device.hostname}_${Array.from(deviceCauses).join("_")}`}
          hostname={device.hostname}
          eventList={eventList}
        />
      );

      deviceCauses.forEach((cause) => {
        byCause[cause].push(deviceEntry);
      });
    }
  });

  return byCause;
}

type SyncStatusProps = {
  readonly devices: SyncTargetDevice[];
  readonly synchistory: SyncHistory;
  readonly target: CommitTarget;
};

export function SyncStatus({ devices, synchistory, target }: SyncStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const renderDeviceList = () => {
    const causes = getCauses(devices, synchistory);
    const columns = Object.entries(causes).map(([cause, devices]) => ({
      cause,
      devices,
    }));

    return columns.length === 0 ? (
      <NoEventsContent />
    ) : (
      <EventsTable columns={columns} />
    );
  };

  const getCommitTargetName = () => {
    if (target.all) {
      return "All unsynchronized devices";
    }
    if (target.hostname) {
      return `Hostname: ${target.hostname}`;
    }
    if (target.group) {
      return `Group: ${target.group}`;
    }
    return "Unknown";
  };

  return (
    <>
      <h1 key="header">Commit configuration changes (syncto)</h1>
      <div key="container" className="task-container">
        <div key="heading" className="heading">
          <h2>
            <Icon
              name="dropdown"
              onClick={() => setExpanded((prev) => !prev)}
              rotated={expanded ? undefined : "counterclockwise"}
            />
            Target: {getCommitTargetName()}
            <Tooltip
              title="Specifies the target devices for the dry run and confirm commit actions below. Synchronization events are previous events that has caused the target devices to have become unsynchronized."
              slotProps={{ tooltip: { sx: { maxWidth: "none" } } }}
            >
              <HelpOutlineOutlinedIcon fontSize="small" />
            </Tooltip>
          </h2>
        </div>
        <div key="events" className="task-collapsable" hidden={!expanded}>
          <p key="syncstatus">
            Synchronization events for: {getCommitTargetName()}
          </p>
          {renderDeviceList()}
        </div>
      </div>
    </>
  );
}
