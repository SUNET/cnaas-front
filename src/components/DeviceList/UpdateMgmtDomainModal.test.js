import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import UpdateMgmtDomainModal from "./UpdateMgmtDomainModal";

import {
  deleteData as mockDeleteData,
  putData as mockPutData,
} from "../../utils/sendData";

jest.mock("../../utils/sendData");
mockDeleteData.mockResolvedValue({
  success: "ok",
  json: () => Promise.resolve([{ data: { deleted_mgmtdomain: { id: 42 } } }]),
});
mockPutData.mockResolvedValue({
  success: "ok",
  json: () => Promise.resolve([{ data: { updated_mgmtdomain: { id: 42 } } }]),
});

beforeEach(() => {
  mockPutData.mockClear();
  mockDeleteData.mockClear();
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockReturnValue("localStorageMockValue");
});

afterAll(() => {
  global.Storage.prototype.getItem.mockReset();
});

const mockCloseAction = jest.fn();
function renderComponent(ipv4Initial = "", ipv6Initial = "", vlanInitial = "") {
  render(
    <UpdateMgmtDomainModal
      mgmtId="42"
      deviceA="deviceA"
      deviceB="deviceB"
      ipv4Initial={ipv4Initial}
      ipv6Initial={ipv6Initial}
      vlanInitial={vlanInitial}
      isOpen
      closeAction={mockCloseAction}
      onDelete={jest.fn()}
      onUpdate={jest.fn()}
    />,
  );
}

test("renders with default values", async () => {
  renderComponent("1.1.1.1", "::::", "1900");

  const ipv4Input = screen.getByLabelText(/ipv4 gateway/i);
  expect(ipv4Input.value).toBe("1.1.1.1");

  const ipv6Input = screen.getByLabelText(/ipv6 gateway/i);
  expect(ipv6Input.value).toBe("::::");

  const vlanInput = screen.getByLabelText(/vlan id/i);
  expect(vlanInput.value).toBe("1900");

  expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  // with no errors
  expect(screen.queryAllByRole("listitem").length).toBe(0);
});

test("type input and click add", async () => {
  renderComponent();
  const ipv4Input = screen.getByLabelText(/ipv4 gateway/i);
  await userEvent.type(ipv4Input, "1.2.3.4/24");

  const ipv6Input = screen.getByLabelText(/ipv6 gateway/i);
  await userEvent.type(ipv6Input, "::1234:5678:91.123.4.56");

  const vlanInput = screen.getByLabelText(/vlan id/i);
  await userEvent.type(vlanInput, "1950");

  const updateButton = screen.getByRole("button", { name: /update/i });
  await userEvent.click(updateButton);

  expect(mockDeleteData).not.toHaveBeenCalled();
  expect(mockPutData).toHaveBeenCalledWith(
    expect.stringContaining("https://"),
    expect.stringContaining("local"),
    {
      id: "42",
      device_a: "deviceA",
      device_b: "deviceB",
      ipv4_gw: "1.2.3.4/24",
      ipv6_gw: "::1234:5678:91.123.4.56",
      vlan: "1950",
    },
  );
});

test("click delete", async () => {
  renderComponent("1.1.1.1", "::::", "1900");

  const deleteButton = screen.getByRole("button", { name: /delete/i });
  await userEvent.click(deleteButton);

  const confirmDeleteButton = screen.getByRole("button", {
    name: /confirm delete/i,
  });
  expect(confirmDeleteButton).toBeDisabled();

  const confirmDeleteInput = screen.getByPlaceholderText(/confirm id/i);
  await userEvent.type(confirmDeleteInput, "42");
  expect(confirmDeleteButton).not.toBeDisabled();

  await userEvent.click(confirmDeleteButton);
  expect(mockPutData).not.toHaveBeenCalled();
  expect(mockDeleteData).toHaveBeenCalledTimes(1);
});
