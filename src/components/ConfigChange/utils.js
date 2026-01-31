import _ from "lodash";

import { getData } from "../../utils/getData";

export const getDeviceList = async (token, target) => {
  if (target.hostname) {
    const url = `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=${target.hostname}&filter[state]=MANAGED&per_page=1`;

    const data = await getData(url, token);

    return data.data.devices;
  }
  if (target.group) {
    const urlDevices = `${process.env.API_URL}/api/v1.0/devices?filter[synchronized]=false&filter[state]=MANAGED&per_page=1000`;
    const urlGroup = `${process.env.API_URL}/api/v1.0/groups/${target.group}`;

    const dataDevices = await getData(urlDevices, token);
    const dataGroup = await getData(urlGroup, token);

    return _.filter(dataDevices.data.devices, (dev) =>
      dataGroup.data.groups[target.group].includes(dev.hostname),
    );
  }
  const url = `${process.env.API_URL}/api/v1.0/devices?filter[synchronized]=false&filter[state]=MANAGED&per_page=1000`;
  const data = await getData(url, token);

  return data.data.devices;
};

export const getSyncHistory = async (token) => {
  const url = `${process.env.API_URL}/api/v1.0/device_synchistory`;
  const data = await getData(url, token);

  return data.data.hostnames;
};
