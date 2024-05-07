import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AddMgmtDomainModal from "./AddMgmtDomainModal";

import { postData as mockPostData } from "../../utils/sendData";

jest.mock("../../utils/sendData");
mockPostData.mockResolvedValue({
  success: "ok",
  data: { added_mgmtdomain: { id: 66 } },
});

beforeEach(() => {
  mockPostData.mockClear();
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockReturnValue("localStorageMockValue");
});

afterAll(() => {
  global.Storage.prototype.getItem.mockReset();
});

const mockCloseAction = jest.fn();
function renderComponent() {
  render(
    <AddMgmtDomainModal
      deviceA="deviceA"
      deviceBCandidates={[{ hostname: "a" }, { hostname: "b" }]}
      isOpen
      onAdd={jest.fn()}
      closeAction={mockCloseAction}
    />,
  );
}

test("renders", async () => {
  renderComponent();

  expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  // with no errors
  expect(screen.queryAllByRole("listitem").length).toBe(0);
});

test("type input and click add", async () => {
  renderComponent();

  const domainBSelect = screen.getByText("device_b");
  userEvent.click(domainBSelect);
  expect(domainBSelect.textContent).toBe("device_b");
  const dropdownOptions = screen.getAllByRole("option");
  await userEvent.click(dropdownOptions[1]);

  const ipv4Input = screen.getByLabelText(/ipv4 gateway/i);
  await userEvent.type(ipv4Input, "1.2.3.4/24");

  const ipv6Input = screen.getByLabelText(/ipv6 gateway/i);
  await userEvent.type(ipv6Input, "::1234:5678:91.123.4.56");

  const vlanInput = screen.getByLabelText(/vlan id/i);
  await userEvent.type(vlanInput, "1950");

  const addButton = screen.getByRole("button", { name: /add/i });
  await userEvent.click(addButton);

  expect(mockPostData).toHaveBeenCalledTimes(1);
  expect(mockPostData).toHaveBeenCalledWith(
    expect.stringContaining("https://"),
    expect.stringContaining("local"),
    {
      device_a: "deviceA",
      device_b: "b",
      ipv4_gw: "1.2.3.4/24",
      ipv6_gw: "::1234:5678:91.123.4.56",
      vlan: "1950",
    },
  );
});

test("type input and click cancel should clear fields", async () => {
  renderComponent();

  const domainBSelect = screen.getByText("device_b");
  const dropdownOptions = screen.getAllByRole("option");
  expect(domainBSelect).toBeVisible();
  userEvent.click(domainBSelect);
  await userEvent.click(dropdownOptions[1]);
  expect(domainBSelect).not.toBeVisible();

  const ipv4Input = screen.getByLabelText(/ipv4 gateway/i);
  await userEvent.type(ipv4Input, "1.2.3.4/24");
  expect(ipv4Input.value).toBe("1.2.3.4/24");

  const ipv6Input = screen.getByLabelText(/ipv6 gateway/i);
  await userEvent.type(ipv6Input, "::1234:5678:91.123.4.56");
  expect(ipv6Input.value).toBe("::1234:5678:91.123.4.56");

  const vlanInput = screen.getByLabelText(/vlan id/i);
  await userEvent.type(vlanInput, "1950");
  expect(vlanInput.value).toBe("1950");

  const cancelButton = screen.getByRole("button", { name: /cancel/i });
  await userEvent.click(cancelButton);

  expect(mockPostData).not.toHaveBeenCalled();
  expect(mockCloseAction).toHaveBeenCalledTimes(1);

  expect(ipv4Input.value).toBeFalsy();
  expect(ipv6Input.value).toBeFalsy();
  expect(vlanInput.value).toBeFalsy();
});
