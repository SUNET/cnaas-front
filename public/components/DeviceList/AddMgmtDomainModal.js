import React, { useState } from "react";
import {
  Button,
  Form,
  FormField,
  FormGroup,
  FormInput,
  FormSelect,
  Icon,
  Modal,
  ModalActions,
  ModalContent,
  ModalDescription,
  ModalHeader,
} from "semantic-ui-react";
import { postData } from "../../utils/sendData";

function AddMgmtDomainModal({
  deviceA,
  deviceBCandidates,
  isOpen,
  onAdd,
  closeAction,
}) {
  const [formData, setFormData] = useState({ ipv4: "", ipv6: "", vlan: "" });
  const [errors, setErrors] = useState([]);

  const { deviceB, ipv4, ipv6, vlan } = formData;

  const deviceBOptions =
    deviceBCandidates?.map((device, index) => ({
      key: device.hostname,
      text: device.hostname,
      value: index,
    })) || [];

  function clearForm() {
    setErrors([]);
    setFormData({ ipv4: "", ipv6: "", vlan: "" });
  }

  async function handleAdd() {
    const credentials = localStorage.getItem("token");
    const payload = {
      device_a: deviceA,
      device_b: deviceB,
      ipv4_gw: ipv4,
      ipv6_gw: ipv6,
      vlan,
    };
    postData(
      `${process.env.API_URL}/api/v1.0/mgmtdomains`,
      credentials,
      payload,
    )
      .then((resp) => {
        clearForm();
        console.log(resp)
        onAdd(resp.data.added_mgmtdomain.id);
      })
      .catch(async (errResp) => {
        console.log(errResp)
        const errObj = await errResp.json();
        setErrors(errObj.message);
      });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelected(e, data) {
    const selectedValue = data.value;
    setFormData((prev) => ({
      ...prev,
      deviceB: deviceBOptions[selectedValue].key,
    }));
  }

  function handleCancel() {
    setFormData({ ipv4: "", ipv6: "", vlan: "" });
    setErrors([]);
    closeAction();
  }

  return (
    <Modal open={isOpen} onClose={handleCancel}>
      <ModalHeader>Add Management Domain</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <Form>
            <FormGroup grouped>
              <FormField>
                <FormSelect
                  inline
                  id="mgmt_add_domain_b_select"
                  name="domainB"
                  label={
                    <>
                      <span style={{ fontWeight: "lighter" }}>
                        Devices in managament domain:
                      </span>
                      {deviceA},{" "}
                    </>
                  }
                  placeholder="device_b"
                  selection
                  options={deviceBOptions}
                  onChange={handleSelected}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_add_ipv4_input"
                  label="IPv4 Gateway"
                  name="ipv4"
                  type="text"
                  value={ipv4}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_add_ipv6_input"
                  label="IPv6 Gateway"
                  name="ipv6"
                  type="text"
                  value={ipv6}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_add_vlan_input"
                  label="VLAN ID"
                  name="vlan"
                  type="text"
                  value={vlan}
                  onChange={handleChange}
                />
              </FormField>
            </FormGroup>
          </Form>
          <ul id="mgmt_add_error_list" style={{ color: "red" }}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </ModalDescription>
      </ModalContent>
      <ModalActions>
        <Button color="yellow" onClick={handleCancel}>
          Cancel <Icon name="cancel" />
        </Button>
        <Button color="green" onClick={handleAdd}>
          Add <Icon name="checkmark" />
        </Button>
      </ModalActions>
    </Modal>
  );
}

export default AddMgmtDomainModal;
