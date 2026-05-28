import { useSearchParams } from "react-router";
import { InterfaceConfigProvider } from "../stores/InterfaceConfigContext";
import { InterfaceConfig } from "./InterfaceConfig";

/**
 * Route-level component for /interface-config.
 *
 * Reads hostname from query params, mounts the context provider,
 * and renders the InterfaceConfig presentation component.
 */
export function InterfaceConfigPage() {
  const [searchParams] = useSearchParams();
  const hostname = searchParams.get("hostname");

  if (!hostname) {
    return (
      <section>
        <h2>Interface configuration</h2>
        <p>
          Missing hostname in URL. Append <code>?hostname=&lt;device&gt;</code>.
        </p>
      </section>
    );
  }

  return (
    <InterfaceConfigProvider hostname={hostname}>
      <InterfaceConfig hostname={hostname} />
    </InterfaceConfigProvider>
  );
}
