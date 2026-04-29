import { useState } from "react";
import { Popup, Table, Icon } from "semantic-ui-react";
import { formatISODate } from "../../utils/formatters";
import type {
  CommitTarget,
  Device,
  SyncHistory,
} from "../../store/configChange/configChangeReducer";

interface SyncEvent {
  readonly cause: string;
  readonly by: string;
  readonly date: string;
}

function NoEventsContent() {
  return (
    <p key="no_events">
      No known synchronization events (old events are not persistent across
      server reboots)
    </p>
  );
}

interface EventsTableProps {
  readonly contents: React.ReactNode[];
  readonly headers: string[];
}

function EventsTable({ contents, headers }: EventsTableProps) {
  return (
    <div key="tablecontainer" className="tablecontainer">
      <Table key="synceventlist" celled collapsing>
        <Table.Header>
          <Table.Row>
            {headers.map((cause) => {
              return <Table.HeaderCell key={cause}>{cause}</Table.HeaderCell>;
            })}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          <Table.Row>
            {contents.map((devices, index) => {
              return (
                <Table.Cell key={`devices_cell_${index}`}>
                  <ul>{devices}</ul>
                </Table.Cell>
              );
            })}
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  );
}

interface DeviceEntryProps {
  readonly hostname: string;
  readonly eventList: SyncEvent[];
}

function DeviceEntry({ hostname, eventList }: DeviceEntryProps) {
  return (
    <li key={hostname}>
      <Popup
        flowing
        hoverable
        content={
          <ul key={`device_entry_${hostname}`}>
            {eventList.map((item, index) => (
              <li key={`device_entry_${hostname}_${index}`}>
                {item.cause} by {item.by} at {item.date}
              </li>
            ))}
          </ul>
        }
        trigger={
          <span className="popup-trigger">
            {hostname} ({eventList.length})
          </span>
        }
      />
    </li>
  );
}

interface RawSyncEvent {
  readonly cause: string;
  readonly by: string;
  readonly timestamp: number;
}

function getCauses(devices: Device[], synchistory: SyncHistory) {
  if (!synchistory || !devices.length) {
    return {};
  }

  const byCause: Record<string, React.ReactNode[]> = {};
  const causeTypes = new Set<string>();

  devices.forEach((device) => {
    if (device.hostname in synchistory) {
      const deviceCauses = new Set<string>();
      const eventList = (synchistory[device.hostname] as RawSyncEvent[]).map(
        (e) => {
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
        },
      );

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

interface SyncStatusProps {
  readonly devices: Device[];
  readonly synchistory: SyncHistory;
  readonly target: CommitTarget;
}

export default function SyncStatus({
  devices,
  synchistory,
  target,
}: SyncStatusProps) {
  const [expanded, setExpanded] = useState(false);

  const renderDeviceList = () => {
    const headers: string[] = [];
    const contents: React.ReactNode[] = [];

    const causes = getCauses(devices, synchistory);
    Object.entries(causes).forEach(([cause, devices]) => {
      headers.push(cause);
      contents.push(devices);
    });

    return contents.length < 1 ? (
      <NoEventsContent />
    ) : (
      <EventsTable contents={contents} headers={headers} />
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
            <Popup
              content="Specifies the target devices for the dry run and confirm commit actions below. Synchronization events are previous events that has caused the target devices to have become unsynchronized."
              trigger={<Icon name="question circle outline" size="small" />}
              wide
            />
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
