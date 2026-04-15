import { type ReactNode } from "react";

export function InterfaceStatusDown(props: {
  bounceInterfaceButton: ReactNode;
  hostname: string | null;
  name: string;
  statusMessage: ReactNode;
  toggleEnabled: ReactNode;
}): JSX.Element;
