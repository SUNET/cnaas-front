/**
 * Type declarations for third-party modules that lack bundled types.
 */

declare module "react-semantic-toasts-2" {
  import { Component, type ReactNode } from "react";

  interface SemanticToastContainerProps {
    position?: string;
    maxToasts?: number;
    animation?: string;
    className?: string;
  }

  export class SemanticToastContainer extends Component<SemanticToastContainerProps> {}

  interface ToastOptions {
    type?: "success" | "error" | "warning" | "info";
    title?: string;
    description?: string | ReactNode;
    time?: number;
    icon?: string;
    animation?: string;
    size?: string;
  }

  export function toast(options: ToastOptions): void;
}
