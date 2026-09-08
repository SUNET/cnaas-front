import { makeJob } from "../../../test-utils/makeJob";
import {
  actions,
  firmwareUpgradeReducer,
  initialState,
  type FirmwareUpgradeState,
} from "./firmwareUpgradeReducer";

test("SET_STEP2_JOB_DATA stores the job", () => {
  const job = makeJob({ status: "RUNNING" });
  const next = firmwareUpgradeReducer(initialState, {
    type: actions.SET_STEP2_JOB_DATA,
    data: job,
  });
  expect(next.step2JobData).toBe(job);
});

test("APPEND_LOG appends the given line verbatim", () => {
  const next = firmwareUpgradeReducer(initialState, {
    type: actions.APPEND_LOG,
    line: "hello\n",
  });
  expect(next.logLines).toEqual(["hello\n"]);
});

test("APPEND_LOG bounds the buffer at 1000 lines", () => {
  const filled: FirmwareUpgradeState = {
    ...initialState,
    logLines: Array.from({ length: 1000 }, (_, i) => `line-${i}\n`),
  };
  const next = firmwareUpgradeReducer(filled, {
    type: actions.APPEND_LOG,
    line: "overflow\n",
  });
  expect(next.logLines).toHaveLength(1000);
  expect(next.logLines.at(-1)).toBe("overflow\n");
  expect(next.logLines[0]).toBe("line-1\n");
});

test("SET_START_ERROR stores whatever message it is handed", () => {
  const next = firmwareUpgradeReducer(initialState, {
    type: actions.SET_START_ERROR,
    message: "boom",
  });
  expect(next.startError).toBe("boom");
});

test("UPSERT_HOST_FIRMWARE adds new hosts", () => {
  const next = firmwareUpgradeReducer(initialState, {
    type: actions.UPSERT_TARGET_DEVICE_INFO,
    targetDevices: [{ hostname: "sw1" }],
  });
  expect(next.targetDevices).toEqual([{ hostname: "sw1" }]);
});

test("UPSERT_HOST_FIRMWARE merges info into existing hosts", () => {
  const seeded: FirmwareUpgradeState = {
    ...initialState,
    targetDevices: [{ hostname: "sw1" }],
  };
  const next = firmwareUpgradeReducer(seeded, {
    type: actions.UPSERT_TARGET_DEVICE_INFO,
    targetDevices: [{ hostname: "sw1", os_version: "4.30", cpu_arch: null }],
  });
  expect(next.targetDevices).toEqual([
    { hostname: "sw1", os_version: "4.30", cpu_arch: null },
  ]);
});
