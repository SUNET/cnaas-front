import { useState, type ChangeEvent } from "react";
import {
  Button,
  type DropdownProps,
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
import { createMgmtDomain } from "../../api/deviceListApi";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { Device } from "../../../../types/device";

type AddMgmtDomainModalProps = {
  readonly deviceA?: string | null;
  readonly deviceBCandidates?: readonly Device[];
  readonly isOpen: boolean;
  readonly onAdd: (id: number) => void;
  readonly closeAction: () => void;
};

type FormState = {
  readonly deviceB: string;
  readonly ipv4: string;
  readonly ipv6: string;
  readonly vlan: string;
};

type ApiErrorWithJson = {
  readonly json: () => Promise<{ message?: readonly string[] }>;
};

function hasJsonMethod(error: unknown): error is ApiErrorWithJson {
  return (
    typeof error === "object" &&
    error !== null &&
    "json" in error &&
    typeof error.json === "function"
  );
}

const EMPTY_FORM: FormState = { deviceB: "", ipv4: "", ipv6: "", vlan: "" };

export function AddMgmtDomainModal({
  deviceA,
  deviceBCandidates,
  isOpen,
  onAdd,
  closeAction,
}: AddMgmtDomainModalProps) {
  const { token } = useAuthToken();
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<readonly string[]>([]);

  const { ipv4, ipv6, vlan } = formData;

  const deviceBOptions =
    deviceBCandidates?.map((device, index) => ({
      key: device.hostname,
      text: device.hostname,
      value: index,
    })) ?? [];

  function clearForm() {
    setErrors([]);
    setFormData(EMPTY_FORM);
  }

  async function handleAdd() {
    if (!deviceA) return;
    try {
      const resp = await createMgmtDomain(
        {
          device_a: deviceA,
          device_b: formData.deviceB,
          ipv4_gw: ipv4,
          ipv6_gw: ipv6,
          vlan: Number.parseInt(vlan, 10),
        },
        token,
      );
      clearForm();
      onAdd(resp.data.added_mgmtdomain.id);
    } catch (error) {
      if (hasJsonMethod(error)) {
        try {
          const errObj = await error.json();
          setErrors(errObj.message ?? ["Unknown error"]);
        } catch {
          setErrors(["Failed to parse error response"]);
        }
      } else {
        setErrors([error instanceof Error ? error.message : String(error)]);
      }
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelected(_e: unknown, data: DropdownProps) {
    const selectedValue = data.value;
    if (typeof selectedValue !== "number") return;
    const option = deviceBOptions[selectedValue];
    if (!option) return;
    setFormData((prev) => ({ ...prev, deviceB: option.key }));
  }

  function handleCancel() {
    clearForm();
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
        <Button color="black" onClick={handleCancel}>
          Cancel <Icon name="cancel" />
        </Button>
        <Button color="green" onClick={handleAdd}>
          Add <Icon name="checkmark" />
        </Button>
      </ModalActions>
    </Modal>
  );
}
