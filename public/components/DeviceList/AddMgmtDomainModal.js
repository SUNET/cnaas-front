import React, { useState } from "react";
import {
  Button,
  Dropdown,
  Icon,
  Input,
  Modal,
  ModalActions,
  ModalContent,
  ModalDescription,
  ModalHeader,
} from "semantic-ui-react";

function AddMgmtDomainModal({
  deviceA,
  deviceBCandidates,
  isOpen,
  onAdd,
  closeAction,
}) {
  const [deviceB, setDeviceB] = useState("");
  const [ipv4, setIpv4] = useState("");
  const [ipv6, setIpv6] = useState("");
  const [vlan, setVlan] = useState("");

  function handleAdd() {
    const updatedData = {
      device_a: deviceA,
      device_b: deviceB,
      ipv4_gw: ipv4,
      ipv6_gw: ipv6,
      vlan,
    };
    onAdd(updatedData);
  }

  const deviceBOptions =
    deviceBCandidates?.map((device, index) => ({
      key: device.hostname,
      text: device.hostname,
      value: index,
    })) || [];

  function handleSelected(e, data) {
    const selectedValue = data.value;
    setDeviceB(deviceBOptions[selectedValue].key);
  }

  function handleClose() {
    setDeviceB("");
    setIpv4("");
    setIpv6("");
    setVlan("");
    closeAction();
  }

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <ModalHeader>Add Management Domain</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <span style={{ fontWeight: "lighter" }}>
            Devices in managament domain:{" "}
          </span>
          <span>
            {`${deviceA}  `}
            <Dropdown
              aria-label="device_b_dropdown"
              placeholder="device_b"
              selection
              options={deviceBOptions}
              onChange={handleSelected}
            />
          </span>
          <table>
            <tbody>
              <tr>
                <td>IPv4 Gateway</td>
                <td aria-label="ipv4-input">
                  <Input
                    type="text"
                    value={ipv4}
                    onChange={(e) => setIpv4(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>IPv6 Gateway</td>
                <td aria-label="ipv6-input">
                  <Input
                    type="text"
                    value={ipv6}
                    onChange={(e) => setIpv6(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>VLAN Gateway</td>
                <td aria-label="vlan-input">
                  <Input
                    type="text"
                    value={vlan}
                    onChange={(e) => setVlan(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </ModalDescription>
      </ModalContent>
      <ModalActions>
        <Button color="yellow" onClick={handleClose}>
          Cancel <Icon name="cancel" />
        </Button>
        <Button color="green" onClick={() => handleAdd()}>
          Add <Icon name="checkmark" />
        </Button>
      </ModalActions>
    </Modal>
  );
}

export default AddMgmtDomainModal;
