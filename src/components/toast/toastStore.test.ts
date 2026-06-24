import {
  dismissAllToasts,
  dismissToast,
  getSnapshot,
  showToast,
  subscribe,
} from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    dismissAllToasts();
    jest.useRealTimers();
  });

  it("adds a toast and returns its id", () => {
    const id = showToast({ severity: "success", title: "Saved" });

    const snapshot = getSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toMatchObject({
      id,
      severity: "success",
      title: "Saved",
    });
  });

  it("places the newest toast on top", () => {
    showToast({ severity: "info", title: "First", duration: 0 });
    showToast({ severity: "info", title: "Second", duration: 0 });

    expect(getSnapshot().map((item) => item.title)).toEqual([
      "Second",
      "First",
    ]);
  });

  it("caps the stack at three and evicts the oldest", () => {
    showToast({ severity: "info", title: "1", duration: 0 });
    showToast({ severity: "info", title: "2", duration: 0 });
    showToast({ severity: "info", title: "3", duration: 0 });
    showToast({ severity: "info", title: "4", duration: 0 });

    expect(getSnapshot().map((item) => item.title)).toEqual(["4", "3", "2"]);
  });

  it("auto-dismisses after the given duration", () => {
    showToast({ severity: "info", title: "Temp", duration: 3000 });
    expect(getSnapshot()).toHaveLength(1);

    jest.advanceTimersByTime(3000);
    expect(getSnapshot()).toHaveLength(0);
  });

  it("persists by default when no duration is given", () => {
    showToast({ severity: "info", title: "Temp" });

    jest.advanceTimersByTime(60_000);
    expect(getSnapshot()).toHaveLength(1);
  });

  it("keeps a persistent toast until dismissed", () => {
    const id = showToast({
      severity: "warning",
      title: "Sticky",
      duration: 0,
    });

    jest.advanceTimersByTime(60_000);
    expect(getSnapshot()).toHaveLength(1);

    dismissToast(id);
    expect(getSnapshot()).toHaveLength(0);
  });

  it("dismisses a single toast by id", () => {
    const first = showToast({ severity: "info", title: "1", duration: 0 });
    showToast({ severity: "info", title: "2", duration: 0 });

    dismissToast(first);

    expect(getSnapshot().map((item) => item.title)).toEqual(["2"]);
  });

  it("dismisses all toasts", () => {
    showToast({ severity: "info", title: "1", duration: 0 });
    showToast({ severity: "info", title: "2", duration: 0 });

    dismissAllToasts();

    expect(getSnapshot()).toHaveLength(0);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    showToast({ severity: "info", title: "1", duration: 0 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    showToast({ severity: "info", title: "2", duration: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns a stable snapshot reference when nothing changes", () => {
    showToast({ severity: "info", title: "1", duration: 0 });
    const snapshot = getSnapshot();

    expect(getSnapshot()).toBe(snapshot);

    // Dismissing an unknown id must not allocate a new snapshot.
    dismissToast("does-not-exist");
    expect(getSnapshot()).toBe(snapshot);
  });
});
