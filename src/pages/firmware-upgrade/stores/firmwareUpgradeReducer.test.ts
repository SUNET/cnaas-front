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
    logLines: Array.from({ length: 999 }, (_, i) => `line-${i}\n`),
  };
  const next = firmwareUpgradeReducer(filled, {
    type: actions.APPEND_LOG,
    line: "overflow\n",
  });
  expect(next.logLines).toHaveLength(999);
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
