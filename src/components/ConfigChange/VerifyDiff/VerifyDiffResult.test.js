import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import VerifyDiffResult from "./VerifyDiffResult";

// Mock SyntaxHighlight component
jest.mock("../../SyntaxHighlight", () => {
  return function MockSyntaxHighlight({ code }) {
    return <pre data-testid="syntax-highlight">{code}</pre>;
  };
});

function renderComponent(props = {}) {
  const defaultProps = {
    deviceNames: [],
    deviceData: [],
  };
  return render(<VerifyDiffResult {...defaultProps} {...props} />);
}

test("displays 'All devices returned empty diffs' when devices have no diffs", () => {
  const deviceNames = ["switch-01"];
  const deviceData = [
    {
      job_tasks: [{ diff: "", failed: false, result: "", task_name: "task1" }],
    },
  ];

  renderComponent({ deviceNames, deviceData });

  expect(
    screen.getByText("All devices returned empty diffs"),
  ).toBeInTheDocument();
});

test("displays device diffs when devices have diff content", () => {
  const deviceNames = ["switch-01"];
  const deviceData = [
    {
      job_tasks: [
        {
          diff: "+new config line",
          failed: false,
          result: "",
          task_name: "Sync device config",
        },
      ],
    },
  ];

  renderComponent({ deviceNames, deviceData });

  expect(screen.getByText("switch-01 diffs")).toBeInTheDocument();
  expect(screen.getByTestId("syntax-highlight")).toHaveTextContent(
    "+new config line",
  );
});

test("displays all failed tasks except ignored ones, with task names and tracebacks", () => {
  // This test mimics the real API response structure where:
  // - First failed task (push_sync_device) should be ignored
  // - Second task (Generate device config) succeeded
  // - Third failed task (Sync device config) has the actual traceback
  const tracebackResult =
    "Traceback (most recent call last):\n" +
    '  File "/opt/cnaas/venv/lib/python3.11/site-packages/pyeapi/eapilib.py", line 463, in send\n' +
    "    raise CommandError(code, msg, command_error=err, output=out)\n" +
    "pyeapi.eapilib.CommandError: Error [1002]: CLI command failed";

  const deviceNames = ["tug-dc-sw3"];
  const deviceData = [
    {
      job_tasks: [
        {
          diff: "",
          failed: true,
          result: "Subtask: Sync device config (failed)\n",
          task_name: "push_sync_device",
        },
        {
          diff: "",
          failed: false,
          result: "hostname tug-dc-sw3\n...",
          task_name: "Generate device config",
        },
        {
          diff: "",
          failed: true,
          result: tracebackResult,
          task_name: "Sync device config",
        },
      ],
    },
  ];

  renderComponent({ deviceNames, deviceData });

  // Should show device name with "failed result" label
  expect(screen.getByText("tug-dc-sw3 failed result")).toBeInTheDocument();

  // Should NOT show the ignored push_sync_device task result
  expect(
    screen.queryByText("Subtask: Sync device config (failed)"),
  ).not.toBeInTheDocument();

  // Should show the exception summary (last 2 lines) in pre.exception
  const exceptionElement = document.querySelector("pre.exception");
  expect(exceptionElement).toBeInTheDocument();
  expect(exceptionElement).toHaveTextContent(
    "pyeapi.eapilib.CommandError: Error [1002]: CLI command failed",
  );

  // Should have expandable details with full traceback
  expect(screen.getByText("Show full traceback")).toBeInTheDocument();

  // Should show the full traceback in pre.traceback inside details
  const tracebackElement = document.querySelector("pre.traceback");
  expect(tracebackElement).toBeInTheDocument();
  expect(tracebackElement).toHaveTextContent(
    "Traceback (most recent call last):",
  );
});

test("handles device with failed task but undefined result gracefully", () => {
  const deviceNames = ["switch-01"];
  const deviceData = [
    {
      job_tasks: [
        {
          diff: "",
          failed: true,
          result: undefined,
          task_name: "Sync device config",
        },
      ],
    },
  ];

  // Should not throw an error
  expect(() => renderComponent({ deviceNames, deviceData })).not.toThrow();

  // Should still show the device name with "failed result" label
  expect(screen.getByText("switch-01 failed result")).toBeInTheDocument();

  // Should have the expandable details
  expect(screen.getByText("Show full traceback")).toBeInTheDocument();
});
