import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import { styled } from "@mui/material/styles";
import { Tooltip } from "../../../components/Tooltip";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { GraphiteInterface } from "../../../components/GraphiteInterface";
import {
  fetchInterfaceStatus,
  type DeviceInterfaceStatus,
} from "../../../api/deviceApi";
import { fetchNetboxDashboardInterfaces } from "../../../api/netboxApi";
import {
  toNetboxDashboardInterface,
  type NetboxDashboardInterface,
} from "../types/netbox";

// Responsive grid of interface status cards (replaces Semantic UI
// `<Grid columns={3} stackable>`).
const InterfaceGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
  gap: "var(--size-md)",
});

type DeviceRef = { readonly id: number; readonly name: string };

export function DashboardInterfaceStatus() {
  const { token } = useAuthToken();

  const [netboxDeviceObjects, setNetboxDeviceObjects] = useState<DeviceRef[]>(
    [],
  );
  const [netboxInterfaceData, setNetboxInterfaceData] = useState<
    NetboxDashboardInterface[]
  >([]);
  const [interfaceStatusData, setInterfaceStatusData] = useState<
    Record<string, DeviceInterfaceStatus>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  const getNetboxObjects = async () => {
    if (netboxDeviceObjects.length) return;
    setIsLoading(true);

    try {
      const raw = await fetchNetboxDashboardInterfaces(token);
      const interfaces = raw.flatMap((intf) => {
        const parsed = toNetboxDashboardInterface(intf);
        return parsed ? [parsed] : [];
      });
      if (interfaces.length === 0) {
        setIsLoading(false);
        return;
      }

      setNetboxInterfaceData(interfaces);
      setNetboxDeviceObjects(
        interfaces.map((intf) => ({
          name: intf.device.name,
          id: intf.device.id,
        })),
      );
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (netboxDeviceObjects.length === 0) return;
    async function loadStatuses() {
      const results = await Promise.allSettled(
        netboxDeviceObjects.map(async (device) => {
          const status = await fetchInterfaceStatus(device.name, token);
          return [device.name, status] as const;
        }),
      );
      const entries = results.flatMap((result) => {
        if (result.status === "fulfilled") return [result.value];
        console.log(result.reason);
        return [];
      });
      setInterfaceStatusData((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
      setIsLoading(false);
    }
    loadStatuses();
  }, [netboxDeviceObjects]);

  useEffect(() => {
    // Legitimate one-time initial fetch into component state on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getNetboxObjects();
  }, []);

  const interfaceList = [];
  for (const device of netboxDeviceObjects) {
    const deviceInterfaces = netboxInterfaceData.filter(
      (intf) => intf.device.id === device.id,
    );
    for (const intf of deviceInterfaces) {
      let operStatus = "Unknown";
      let description = intf.description || "No description";
      let speed = intf.speed ? `${intf.speed} Kbit/s` : "Unknown speed";

      const status = interfaceStatusData[intf.device.name]?.[intf.name];
      if (status) {
        if (status.is_up === true) operStatus = "Up";
        else if (status.is_up === false) operStatus = "Down";
        description = status.description || description;
        if (status.speed) speed = `${status.speed} Mbit/s`;
      }

      interfaceList.push(
        <div key={intf.id} style={{ textAlign: "center" }}>
          <Tooltip
            title={
              <p>
                interface speed: {speed}
                <br />
                NetBox tags: {intf.tags.map((tag) => tag.name).join(", ")}
              </p>
            }
            placement="bottom"
          >
            <div>
              <a
                href={`${process.env.NETBOX_API_URL}dcim/interfaces/${intf.id}/`}
                target="_blank"
                rel="noreferrer"
              >
                {intf.device.name}: {intf.name} - {operStatus}
                <br />
                {description}
              </a>
            </div>
          </Tooltip>
          <GraphiteInterface
            hostname={intf.device.name}
            interfaceName={intf.name}
            showLastMeasurement={false}
          />
        </div>,
      );
    }
  }

  return (
    <>
      {netboxDeviceObjects.length >= 1 && (
        <Divider textAlign="center">Interfaces</Divider>
      )}
      {isLoading && <p>Loading interface status...</p>}
      <InterfaceGrid>{interfaceList}</InterfaceGrid>
    </>
  );
}
