import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { DeviceTableBodyRowCellContent } from "./DeviceTableBodyRowCellContent";
import { makeDevice } from "../testUtils";
import type { Device } from "../../../types/device";

const device = (overrides: Partial<Device> = {}): Device =>
  makeDevice(42, { hostname: "host-42", ...overrides });

const renderCell = (
  props: Parameters<typeof DeviceTableBodyRowCellContent>[0],
) =>
  render(
    <MemoryRouter>
      <DeviceTableBodyRowCellContent {...props} />
    </MemoryRouter>,
  );

describe("DeviceTableBodyRowCellContent", () => {
  test("state column shows DELETED when device.deleted is true", () => {
    renderCell({
      device: device({ deleted: true }),
      column: "state",
      open: false,
    });
    expect(screen.getByText("DELETED")).toBeInTheDocument();
  });

  test("synchronized column renders nothing for non-MANAGED state", () => {
    const { container } = renderCell({
      device: device({ state: "DISCOVERED" }),
      column: "synchronized",
      open: false,
    });
    expect(container).toBeEmptyDOMElement();
  });

  test("synchronized column renders Synchronized for synced MANAGED device", () => {
    renderCell({
      device: device({ synchronized: true }),
      column: "synchronized",
      open: false,
    });
    expect(screen.getByText("Synchronized")).toBeInTheDocument();
  });

  test("synchronized column renders Unsynchronized when out of sync", () => {
    renderCell({
      device: device({ synchronized: false }),
      column: "synchronized",
      open: false,
    });
    expect(screen.getByText("Unsynchronized")).toBeInTheDocument();
  });

  test("id column shows angle-down icon when open", () => {
    renderCell({
      device: device(),
      column: "id",
      open: true,
    });
    expect(screen.getByTestId("angle-down")).not.toBeNull();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  test("id column shows angle-right icon when closed", () => {
    renderCell({
      device: device(),
      column: "id",
      open: false,
    });
    expect(screen.getByTestId("angle-right")).not.toBeNull();
  });

  test("hostname column on MANAGED ACCESS renders interface-config link", () => {
    renderCell({
      device: device(),
      column: "hostname",
      open: false,
    });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/interface-config?hostname=host-42");
  });

  test("hostname column on UNMANAGED has no plug link", () => {
    renderCell({
      device: device({ state: "UNMANAGED" }),
      column: "hostname",
      open: false,
    });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("host-42")).toBeInTheDocument();
  });

  test("hostname column on DIST has no plug link", () => {
    renderCell({
      device: device({ device_type: "DIST" }),
      column: "hostname",
      open: false,
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  test("renders plain string values for arbitrary columns", () => {
    renderCell({
      device: device({ model: "ABC123" }),
      column: "model",
      open: false,
    });
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  test("renders empty for missing optional values", () => {
    const { container } = renderCell({
      device: device(),
      column: "model",
      open: false,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
