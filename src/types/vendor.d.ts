/**
 * Type declarations for third-party modules that lack bundled types.
 *
 * Note: react-semantic-toasts-2 ships its own types in build/index.d.ts,
 * but this ambient declaration takes precedence. Keep it in sync with the
 * bundled types.
 */

declare module "react-semantic-toasts-2" {
  import { Component } from "react";

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
    description?: string;
    time?: number;
    icon?: string;
    animation?: string;
    size?: string;
    color?: string;
  }

  export function toast(
    options: ToastOptions,
    onClose?: () => void,
    onClick?: () => void,
    onDismiss?: () => void,
  ): void;
}
