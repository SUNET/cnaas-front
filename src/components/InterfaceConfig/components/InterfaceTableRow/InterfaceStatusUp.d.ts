import { type ReactNode } from "react";

export function InterfaceStatusUp(props: {
  bounceInterfaceButton: ReactNode;
  hostname: string | null;
  name: string;
  speed: unknown;
  statusMessage: ReactNode;
  toggleEnabled: ReactNode;
}): JSX.Element;
