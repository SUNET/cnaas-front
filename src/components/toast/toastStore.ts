import type { ShowToastInput, Toast } from "./types";

const MAX_TOASTS = 3;

let toasts: readonly Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let idCounter = 0;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setToasts(next: readonly Toast[]): void {
  toasts = next;
  emit();
}

function clearTimer(id: string): void {
  const handle = timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(id);
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): readonly Toast[] {
  return toasts;
}

export function showToast(input: ShowToastInput): string {
  idCounter += 1;
  const id = `toast-${idCounter}`;
  const duration = input.duration ?? 0;

  const toast: Toast = {
    id,
    severity: input.severity,
    title: input.title,
    message: input.message,
    duration,
  };

  // Newest on top; cap the stack and evict the oldest beyond the cap.
  const next = [toast, ...toasts].slice(0, MAX_TOASTS);
  const kept = new Set(next.map((item) => item.id));
  for (const timerId of [...timers.keys()]) {
    if (!kept.has(timerId)) {
      clearTimer(timerId);
    }
  }

  setToasts(next);

  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    );
  }

  return id;
}

export function dismissToast(id: string): void {
  clearTimer(id);
  const next = toasts.filter((item) => item.id !== id);
  if (next.length !== toasts.length) {
    setToasts(next);
  }
}

export function dismissAllToasts(): void {
  for (const id of [...timers.keys()]) {
    clearTimer(id);
  }
  if (toasts.length > 0) {
    setToasts([]);
  }
}
