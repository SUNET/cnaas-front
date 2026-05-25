import { fetchDeviceList, fetchSyncHistory } from "./configChangeApi";
import { getData } from "../../../utils/getData";

jest.mock("../../../utils/getData");

describe("fetchDeviceList", () => {
  it("returns devices from API when target.hostname is provided", async () => {
    const dummyData = {
      status: "success",
      data: {
        devices: [
          {
            id: 130,
            hostname: "a1",
            management_ip: "10.101.3.6",
            vendor: "Arista",
          },
          {
            id: 184,
            hostname: "a4",
            management_ip: "10.101.4.7",
            vendor: "Arista",
          },
        ],
      },
    };

    getData.mockResolvedValue(dummyData);

    const token = "dummy-token";
    const target = { hostname: "a1" };

    const result = await fetchDeviceList(token, target);

    expect(getData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=a1&filter[state]=MANAGED&per_page=1`,
      token,
    );

    expect(result).toEqual(dummyData.data.devices);
  });

  it("filters unsynchronized devices by group membership", async () => {
    getData.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({
          data: {
            devices: [
              { hostname: "sw1", synchronized: false, state: "MANAGED" },
              { hostname: "sw2", synchronized: false, state: "MANAGED" },
              { hostname: "sw3", synchronized: false, state: "MANAGED" },
            ],
          },
        });
      }
      if (url.includes("/groups/core")) {
        return Promise.resolve({
          data: { groups: { core: ["sw1", "sw3"] } },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const result = await fetchDeviceList("token", { group: "core" });

    expect(result).toEqual([
      { hostname: "sw1", synchronized: false, state: "MANAGED" },
      { hostname: "sw3", synchronized: false, state: "MANAGED" },
    ]);
  });
});

describe("fetchSyncHistory", () => {
  it("returns hostnames from API response", async () => {
    const dummyData = {
      status: "success",
      data: {
        hostnames: {
          a1: [
            {
              cause: "interface_updated",
              timestamp: 1759479051.7577403,
              by: "johannes@sunet.se",
              job_id: null,
            },
          ],
        },
      },
    };

    getData.mockResolvedValue(dummyData);

    const token = "dummy-token";
    const result = await fetchSyncHistory(token);

    expect(getData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/device_synchistory`,
      token,
    );

    expect(result).toEqual(dummyData.data.hostnames);
  });
});
