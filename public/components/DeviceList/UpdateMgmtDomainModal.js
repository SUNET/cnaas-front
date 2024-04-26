import React, { useState, useEffect } from "react";
import {
  ModalHeader,
  ModalDescription,
  ModalContent,
  ModalActions,
  Button,
  Icon,
  Input,
  Modal,
} from "semantic-ui-react";

function UpdateMgmtDomainModal({
  mgmtId,
  deviceA,
  deviceB,
  ipv4Default,
  ipv6Default,
  vlanDefault,
  onDelete,
  onUpdate,
  isOpen,
  closeAction,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ipv4, setIpv4] = useState(ipv4Default || "");
  const [ipv6, setIpv6] = useState(ipv6Default || "");
  const [vlan, setVlan] = useState(vlanDefault || "");
  const [deleteMgmtId, setDeleteMgmtId] = useState("");

  useEffect(() => {
    setIpv4(ipv4Default || "");
    setIpv6(ipv6Default || "");
    setVlan(vlanDefault || "");
  }, [ipv4Default, ipv6Default, vlanDefault]);

  function handleConfirmDelete() {
    setConfirmOpen(false);
    onDelete(mgmtId);
  }

  function handleUpdate() {
    const updatedData = {
      id: mgmtId,
      device_a: deviceA,
      device_b: deviceB,
      ipv4_gw: ipv4,
      ipv6_gw: ipv6,
      vlan,
    };
    onUpdate(updatedData);
  }

  return (
    <Modal onClose={closeAction} open={isOpen}>
      <ModalHeader>Management domain {mgmtId}</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <span style={{ fontWeight: "lighter" }}>
            Devices in managament domain:{" "}
          </span>
          <span>
            {deviceA} {"  "} {deviceB}
          </span>
          <table>
            <tbody>
              <tr>
                <td>IPv4 Gateway</td>
                <td aria-label="ipv4-dropdown">
                  <Input
                    type="text"
                    value={ipv4}
                    onChange={(e) => setIpv4(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>IPv6 Gateway</td>
                <td aria-label="ipv6-dropdown">
                  <Input
                    type="text"
                    value={ipv6}
                    onChange={(e) => setIpv6(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td>VLAN Gateway</td>
                <td aria-label="vlan-dropdown">
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
        <Button color="red" onClick={() => setConfirmOpen(true)}>
          Delete <Icon name="remove" />
        </Button>
        <Button color="green" onClick={() => handleUpdate()}>
          Update <Icon name="checkmark" />
        </Button>
      </ModalActions>

      <Modal
        onClose={() => setConfirmOpen(false)}
        open={confirmOpen}
        size="small"
      >
        <ModalHeader>Delete Management Domain {mgmtId}</ModalHeader>
        <ModalContent>
          <label htmlFor="delete-input" style={{ fontWeight: "lighter" }}>
            Are you sure you want to delete managament domain {mgmtId} with
            devices devices {deviceA} and {deviceB}?
          </label>
          <Input
            id="delete-input"
            value={deleteMgmtId}
            placeholder="Confirm id"
            type="string"
            onChange={(e) => setDeleteMgmtId(e.target.value)}
          />
        </ModalContent>
        <ModalActions>
          <Button color="black" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            disabled={Number(deleteMgmtId) !== mgmtId}
            onClick={() => handleConfirmDelete(true)}
          >
            Delete
          </Button>
        </ModalActions>
      </Modal>
    </Modal>
  );
}

export default UpdateMgmtDomainModal;
