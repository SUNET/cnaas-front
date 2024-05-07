import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  FormField,
  FormGroup,
  FormInput,
  Icon,
  Input,
  Modal,
  ModalActions,
  ModalContent,
  ModalDescription,
  ModalHeader,
} from "semantic-ui-react";
import { deleteData, putData } from "../../utils/sendData";

function UpdateMgmtDomainModal({
  mgmtId,
  deviceA,
  deviceB,
  ipv4Initial,
  ipv6Initial,
  vlanInitial,
  onDelete,
  onUpdate,
  isOpen,
  closeAction,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMgmtId, setDeleteMgmtId] = useState("");
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({
    ipv4: ipv4Initial,
    ipv6: ipv6Initial,
    vlan: vlanInitial,
  });

  // initial values might lag, so useEffect is used to catch change in values
  useEffect(() => {
    setFormData({ ipv4: ipv4Initial, ipv6: ipv6Initial, vlan: vlanInitial });
  }, [ipv4Initial, ipv6Initial, vlanInitial]);
  const { ipv4, ipv6, vlan } = formData;

  function clearForm() {
    setErrors([]);
    setFormData({ ipv4: "", ipv6: "", vlan: "" });
    setDeleteMgmtId("");
  }

  function handleCancel() {
    clearForm();
    closeAction();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleConfirmDelete() {
    setConfirmOpen(false);
    const credentials = localStorage.getItem("token");
    deleteData(
      `${process.env.API_URL}/api/v1.0/mgmtdomain/${mgmtId}`,
      credentials,
    )
      .then(() => {
        clearForm();
        onDelete(mgmtId);
      })
      .catch(async (errResp) => {
        const errObj = await errResp.json();
        setErrors(errObj.message);
      });
  }

  async function handleUpdate() {
    const credentials = localStorage.getItem("token");
    const payload = {
      id: mgmtId,
      device_a: deviceA,
      device_b: deviceB,
      ipv4_gw: ipv4,
      ipv6_gw: ipv6,
      vlan,
    };
    putData(
      `${process.env.API_URL}/api/v1.0/mgmtdomain/${payload.id}`,
      credentials,
      payload,
    )
      .then(() => {
        clearForm();
        onUpdate(mgmtId);
      })
      .catch((errResp) => {
        setErrors(errResp.message);
      });
  }

  return (
    <Modal open={isOpen} onClose={handleCancel}>
      <ModalHeader>Management domain {mgmtId}</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <span style={{ fontWeight: "lighter" }}>
            Devices in managament domain:{" "}
          </span>
          <span>{`${deviceA}  ${deviceB}`}</span>
          <Form>
            <FormGroup grouped>
              <FormField>
                <FormInput
                  id="mgmt_update_ipv4_input"
                  label="IPv4 Gateway"
                  name="ipv4"
                  type="text"
                  value={ipv4 || ""}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_update_ipv6_input"
                  label="IPv6 Gateway"
                  name="ipv6"
                  type="text"
                  value={ipv6 || ""}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_update_vlan_input"
                  label="VLAN ID"
                  name="vlan"
                  type="text"
                  value={vlan || ""}
                  onChange={handleChange}
                />
              </FormField>
            </FormGroup>
          </Form>
          <ul id="mgmt_update_error_list" style={{ color: "red" }}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </ModalDescription>
      </ModalContent>
      <ModalActions>
        <Button color="red" onClick={() => setConfirmOpen(true)}>
          Delete <Icon name="remove" />
        </Button>
        <Button color="green" onClick={handleUpdate}>
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
            devices {deviceA} and {deviceB}?
          </label>
          <Input
            id="mgmt_update_delete-input"
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
            disabled={Number(deleteMgmtId) !== Number(mgmtId)}
            onClick={handleConfirmDelete}
          >
            Confirm Delete
          </Button>
        </ModalActions>
      </Modal>
    </Modal>
  );
}

export default UpdateMgmtDomainModal;
