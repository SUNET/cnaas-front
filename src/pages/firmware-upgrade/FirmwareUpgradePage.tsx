import { FirmwareUpgradeProvider } from "./FirmwareUpgradeContext";
import { FirmwareUpgrade } from "./FirmwareUpgrade";

export function FirmwareUpgradePage() {
  return (
    <FirmwareUpgradeProvider>
      <FirmwareUpgrade />
    </FirmwareUpgradeProvider>
  );
}
