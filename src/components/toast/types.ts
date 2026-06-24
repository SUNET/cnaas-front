import type { ReactNode } from "react";

export type ToastSeverity = "success" | "info" | "warning" | "error";

export type Toast = {
  readonly id: string;
  readonly severity: ToastSeverity;
  readonly title: string;
  readonly message?: ReactNode;
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed. */
  readonly duration: number;
};

export type ShowToastInput = {
  readonly severity: ToastSeverity;
  readonly title: string;
  readonly message?: ReactNode;
  /** Auto-dismiss delay in ms. Defaults to `0`, which keeps the toast until dismissed. */
  readonly duration?: number;
};
