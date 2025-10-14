import { getDeviceList, getSyncHistory } from "./utils";
import { getData } from "../../utils/getData";

jest.mock("../../utils/getData");

describe("getDeviceList", () => {
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

    const result = await getDeviceList(token, target);

    expect(getData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/devices?filter[hostname]=a1&filter[state]=MANAGED&per_page=1`,
      token,
    );

    expect(result).toEqual(dummyData.data.devices);
  });
});

describe("getSyncHistory", () => {
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

    // Mock getData to resolve with our dummy data
    getData.mockResolvedValue(dummyData);

    const token = "dummy-token";
    const result = await getSyncHistory(token);

    expect(getData).toHaveBeenCalledWith(
      `${process.env.API_URL}/api/v1.0/device_synchistory`,
      token,
    );

    expect(result).toEqual(dummyData.data.hostnames);
  });
});
