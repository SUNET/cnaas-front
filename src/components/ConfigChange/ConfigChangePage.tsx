import { ConfigChangeProvider } from "../../store/configChange/ConfigChangeContext";
import { ConfigChange } from "./ConfigChange";

export function ConfigChangePage() {
  return (
    <ConfigChangeProvider>
      <ConfigChange />
    </ConfigChangeProvider>
  );
}
