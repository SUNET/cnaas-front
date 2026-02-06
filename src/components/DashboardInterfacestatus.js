import { Grid, Popup, Divider } from "semantic-ui-react";
import { getData, getDataToken } from "../utils/getData";
import { useEffect, useState } from "react";
import { useAuthToken } from "../contexts/AuthTokenContext";
import { GraphiteInterface } from "./InterfaceConfig/InterfaceTableRow/GraphiteInterface";

export function DashboardInterfaceStatus() {
  const { token } = useAuthToken();

  const [netboxDeviceObjects, setNetboxDeviceObjects] = useState([]);
  const [netboxInterfaceData, setNetboxInterfaceData] = useState(null);
  const [interfaceStatusData, setInterfaceStatusData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const getNetboxObjects = async () => {
    if (!process.env.NETBOX_API_URL || !process.env.NETBOX_TENANT_ID) {
      return null;
    }

    let credentials = localStorage.getItem("netboxToken");
    let getFunc = getDataToken;
    let url = process.env.NETBOX_API_URL;
    // fallback
    if (!credentials) {
      credentials = token;
      getFunc = getData;
      url = `${process.env.API_URL}/netbox`;
    }

    if (netboxDeviceObjects?.length) {
      return;
    }
    setIsLoading(true);

    try {
      const netboxInterfacesUrl = `${url}/api/dcim/interfaces/?tenant_id=${process.env.NETBOX_TENANT_ID}&kind=physical&tag=cnaas_dashboard&limit=20`;
      const interfaceData = await getFunc(netboxInterfacesUrl, credentials);
      if (interfaceData) {
        setNetboxInterfaceData(interfaceData.results);
      }

      const deviceList = [];
      for (const interfaceObj of interfaceData.results) {
        const deviceName = interfaceObj.device.name;
        const deviceId = interfaceObj.device.id;
        deviceList.push({ name: deviceName, id: deviceId });
      }
      if (deviceList.length === 0) {
        setIsLoading(false);
        return;
      }

      setNetboxDeviceObjects(deviceList);
    } catch (e) {
      // Some netbox error occurred
      console.log(e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const deviceList = netboxDeviceObjects;

    for (const device of deviceList) {
      const statusUrl = `${process.env.API_URL}/api/v1.0/device/${device.name}/interface_status`;
      getData(statusUrl, token)
        .then((statusData) => {
          setInterfaceStatusData((prevStatus) => ({
            ...prevStatus,
            [device.name]: statusData.data.interface_status,
          }));
          setIsLoading(false);
        })
        .catch((error) => {
          console.log(error);
          setIsLoading(false);
        });
    }
  }, [netboxDeviceObjects]);

  useEffect(() => {
    getNetboxObjects();
  }, []);

  const interfaceList = [];
  for (const device of netboxDeviceObjects || []) {
    for (const intf of netboxInterfaceData.filter(
      (filterIntf) => filterIntf.device.id === device.id,
    ) || []) {
      let operStatus = "Unknown";
      let description = intf.description || "No description";
      let speed = "Unknown speed";
      if (intf.speed) {
        speed = `${intf.speed} Kbit/s`;
      }
      if (interfaceStatusData[intf.device.name]?.[intf.name]) {
        const isUp = interfaceStatusData[intf.device.name][intf.name].is_up;
        if (isUp === true) {
          operStatus = "Up";
        } else if (isUp === false) {
          operStatus = "Down";
        }
        description =
          interfaceStatusData[intf.device.name][intf.name].description ||
          description;
        if (interfaceStatusData[intf.device.name][intf.name].speed) {
          speed = `${interfaceStatusData[intf.device.name][intf.name].speed} Mbit/s`;
        }
      }

      const graphiteHtml = (
        <GraphiteInterface
          key={"graphite" + intf.id}
          hostname={intf.device.name}
          interfaceName={intf.name}
          showLastMeasurement={false}
        />
      );

      interfaceList.push(
        <Grid.Column key={intf.id} textAlign="center">
          <Popup
            key={intf.id}
            content={
              <p>
                interface speed: {speed}
                <br />
                NetBox tags: {intf.tags.map((tag) => tag.name).join(", ")}
              </p>
            }
            position="bottom center"
            hoverable
            wide
            trigger={
              <div>
                <a
                  href={`${process.env.NETBOX_WEB_URL}/dcim/interfaces/${intf.id}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {intf.device.name}: {intf.name} - {operStatus}
                  <br />
                  {description}
                </a>
              </div>
            }
          />
          {graphiteHtml}
        </Grid.Column>,
      );
    }
  }

  return (
    <>
      {netboxDeviceObjects.length >= 1 && (
        <Divider horizontal>Interfaces</Divider>
      )}
      {isLoading && <p>Loading interface status...</p>}
      <Grid columns={3} stackable>
        {interfaceList}
      </Grid>
    </>
  );
}
