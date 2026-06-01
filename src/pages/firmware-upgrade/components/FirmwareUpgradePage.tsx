import { FirmwareUpgradeProvider } from "../stores/FirmwareUpgradeContext";
import { FirmwareUpgrade } from "./FirmwareUpgrade";

export function FirmwareUpgradePage() {
  return (
    <FirmwareUpgradeProvider>
      <FirmwareUpgrade />
    </FirmwareUpgradeProvider>
  );
}
