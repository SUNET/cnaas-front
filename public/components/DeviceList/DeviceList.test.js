import React from "react";
import { BrowserRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import DeviceList from "./DeviceList";

import {
  getData as mockGetData,
  getResponse as mockGetResponse,
} from "../../utils/getData";
import {
  deleteData as mockDeleteData,
  postData as mockPostData,
  putData as mockPutData,
} from "../../utils/sendData";

const io = require("socket.io-client");

jest.mock("socket.io-client");
jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");
io.mockReturnValue({ on: jest.fn(), off: jest.fn() });
mockGetData.mockResolvedValue({ data: { devices: [], inferfaces: [] } });
mockGetResponse.mockResolvedValue({ data: "mock_get_response_value" });
mockDeleteData.mockResolvedValue({ data: "mock_delete_data_value" });
mockPostData.mockResolvedValue({ data: "mock_post_data_value" });
mockPutData.mockResolvedValue({ data: "mock_put_data_value" });

function MockDeviceList({ deviceListProps }) {
  return (
    <BrowserRouter>
      <DeviceList
        location={deviceListProps.location}
        history={deviceListProps.history}
      />
    </BrowserRouter>
  );
}

beforeEach(() => {
  mockGetData.mockClear();
  mockDeleteData.mockClear();
  mockGetResponse.mockClear();
  mockPostData.mockClear();
  mockPutData.mockClear();
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockResolvedValue("localStorageMockValue");
});

afterAll(() => {
  global.Storage.prototype.getItem.mockReset();
});

test("loads and displays", async () => {
  const mockProps = {
    location: {
      search: "",
    },
    history: {
      push: jest.fn(),
      replace: jest.fn(),
    },
  };
  render(<MockDeviceList deviceListProps={mockProps} />);
  const buttons = await screen.findAllByRole("button");

  buttons.forEach((button) => expect(button).toBeEnabled());
});
