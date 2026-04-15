import { useSearchParams } from "react-router";
import { InterfaceConfigProvider } from "./InterfaceConfigContext";
import { InterfaceConfig } from "./InterfaceConfig";

/**
 * Route-level component for /interface-config-v2.
 *
 * Reads hostname from query params, mounts the context provider,
 * and renders the InterfaceConfig presentation component.
 */
export function InterfaceConfigPage() {
  const [searchParams] = useSearchParams();
  const hostname = searchParams.get("hostname") ?? null;

  return (
    <InterfaceConfigProvider hostname={hostname}>
      <InterfaceConfig hostname={hostname} />
    </InterfaceConfigProvider>
  );
}
