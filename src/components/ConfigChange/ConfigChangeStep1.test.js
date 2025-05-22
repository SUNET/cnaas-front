import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import ConfigChangeStep1 from "./ConfigChangeStep1";

import { getData as mockGetData } from "../../utils/getData";
import { putData as mockPutData } from "../../utils/sendData";
import { usePermissions as mockUsePermissions } from "../../contexts/PermissionsContext";

jest.mock("../../utils/getData");
jest.mock("../../utils/sendData");
jest.mock("../../contexts/PermissionsContext");
mockGetData.mockResolvedValue({ data: "repo_name_mock" });
mockPutData.mockResolvedValue(true);

beforeEach(() => {
  mockGetData.mockClear();
  mockPutData.mockClear();
  mockUsePermissions.mockReturnValue({ permissionsCheck: () => true });
});

test("loads and displays 3 enabled buttons", async () => {
  await act(async () =>
    render(
      <ConfigChangeStep1
        onDryRunReady={jest.fn()}
        setRepoWorking={jest.fn()}
      />,
    ),
  );
  const buttons = screen.getAllByRole("button");

  expect(buttons.length).toBe(3);
  buttons.forEach((button) => expect(button).toBeEnabled());
});

test("click refresh settings success", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  render(
    <ConfigChangeStep1 onDryRunReady={jest.fn()} setRepoWorking={jest.fn()} />,
  );

  const refreshSettingsButton = screen.getByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(screen.getByText("success")).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
});

test("click refresh settings not success", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "not_success",
    message: "A message recieved",
  });
  render(
    <ConfigChangeStep1 onDryRunReady={jest.fn()} setRepoWorking={jest.fn()} />,
  );

  const refreshSettingsButton = screen.getByRole("button", {
    name: "Refresh settings",
  });
  await userEvent.click(refreshSettingsButton);

  expect(screen.getByText("error")).toBeInTheDocument();
  expect(screen.getByText("A message recieved")).toBeInTheDocument();
});

test("click refresh and dry run", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  render(
    <ConfigChangeStep1 setRepoWorking={jest.fn()} onDryRunReady={jest.fn()} />,
  );

  const refreshAndDryRunButton = screen.getByRole("button", {
    name: "Refresh settings + dry run",
  });
  await userEvent.click(refreshAndDryRunButton);

  expect(screen.getByText("success")).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
});

test("click refresh templates", async () => {
  mockPutData.mockResolvedValueOnce({
    status: "success",
    data: "repo name mock",
  });
  render(
    <ConfigChangeStep1 setRepoWorking={jest.fn()} onDryRunReady={jest.fn()} />,
  );

  const refreshTemplatesButton = screen.getByRole("button", {
    name: "Refresh templates",
  });
  await userEvent.click(refreshTemplatesButton);

  expect(screen.getByText("success")).toBeInTheDocument();
  expect(screen.getByText("repo name mock")).toBeInTheDocument();
});
