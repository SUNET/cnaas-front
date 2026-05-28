import { ConfigChangeProvider } from "../stores/ConfigChangeContext";
import { ConfigChange } from "./ConfigChange";

export function ConfigChangePage() {
  return (
    <ConfigChangeProvider>
      <ConfigChange />
    </ConfigChangeProvider>
  );
}
