import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { UpdateMgmtDomainModal } from "./UpdateMgmtDomainModal";

import { deleteMgmtDomain, updateMgmtDomain } from "../../api/deviceListApi";
import type { MgmtDomain } from "../../../../types/mgmtDomain";

jest.mock("../../api/deviceListApi");
jest.mock("../../../../stores/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

const mockDeleteMgmtDomain = deleteMgmtDomain as jest.MockedFunction<
  typeof deleteMgmtDomain
>;
const mockUpdateMgmtDomain = updateMgmtDomain as jest.MockedFunction<
  typeof updateMgmtDomain
>;

mockDeleteMgmtDomain.mockResolvedValue({
  status: "success",
  data: { deleted_mgmtdomain: { id: 42 } as MgmtDomain },
});
mockUpdateMgmtDomain.mockResolvedValue({
  status: "success",
  data: { updated_mgmtdomain: { id: 42 } as MgmtDomain },
});

beforeEach(() => {
  mockUpdateMgmtDomain.mockClear();
  mockDeleteMgmtDomain.mockClear();
});

const mockCloseAction = jest.fn();
function renderComponent(ipv4Initial = "", ipv6Initial = "", vlanInitial = "") {
  render(
    <UpdateMgmtDomainModal
      mgmtId={42}
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

  const ipv4Input = screen.getByLabelText(/ipv4 gateway/i) as HTMLInputElement;
  expect(ipv4Input.value).toBe("1.1.1.1");

  const ipv6Input = screen.getByLabelText(/ipv6 gateway/i) as HTMLInputElement;
  expect(ipv6Input.value).toBe("::::");

  const vlanInput = screen.getByLabelText(/vlan id/i) as HTMLInputElement;
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

  expect(mockDeleteMgmtDomain).not.toHaveBeenCalled();
  expect(mockUpdateMgmtDomain).toHaveBeenCalledWith(
    42,
    {
      device_a: "deviceA",
      device_b: "deviceB",
      ipv4_gw: "1.2.3.4/24",
      ipv6_gw: "::1234:5678:91.123.4.56",
      vlan: 1950,
    },
    "test-token",
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
  expect(mockUpdateMgmtDomain).not.toHaveBeenCalled();
  expect(mockDeleteMgmtDomain).toHaveBeenCalledWith(42, "test-token");
});
