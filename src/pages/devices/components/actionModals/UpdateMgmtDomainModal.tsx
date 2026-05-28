import { useState, type ChangeEvent } from "react";
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
import { deleteMgmtDomain, updateMgmtDomain } from "../../api/deviceListApi";
import { useAuthToken } from "../../../../stores/AuthTokenContext";

type UpdateMgmtDomainModalProps = {
  readonly mgmtId: number | null;
  readonly deviceA?: string | null;
  readonly deviceB?: string | null;
  readonly ipv4Initial?: string | null;
  readonly ipv6Initial?: string | null;
  readonly vlanInitial?: string | number | null;
  readonly onDelete: (id: number) => void;
  readonly onUpdate: (id: number) => void;
  readonly isOpen: boolean;
  readonly closeAction: () => void;
};

type FormState = {
  readonly ipv4: string;
  readonly ipv6: string;
  readonly vlan: string;
};

type ApiErrorWithJson = {
  readonly json: () => Promise<{ message?: unknown }>;
};

function hasJsonMethod(error: unknown): error is ApiErrorWithJson {
  return (
    typeof error === "object" &&
    error !== null &&
    "json" in error &&
    typeof error.json === "function"
  );
}

function normalizeErrors(message: unknown): readonly string[] {
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === "string") return [message];
  if (message == null) return ["Unknown error"];
  return [String(message)];
}

function hasMessageField(value: unknown): value is { message: unknown } {
  return typeof value === "object" && value !== null && "message" in value;
}

async function extractErrors(error: unknown): Promise<readonly string[]> {
  // Raw Response (deleteData → checkResponseStatus)
  if (hasJsonMethod(error)) {
    try {
      const errObj = await error.json();
      return normalizeErrors(errObj.message);
    } catch {
      return ["Failed to parse error response"];
    }
  }
  // Plain object reject (putData → checkJsonResponse)
  if (hasMessageField(error)) return normalizeErrors(error.message);
  if (error instanceof Error) return [error.message];
  return [String(error)];
}

export function UpdateMgmtDomainModal({
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
}: UpdateMgmtDomainModalProps) {
  const { token } = useAuthToken();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMgmtId, setDeleteMgmtId] = useState("");
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [formData, setFormData] = useState<FormState>({
    ipv4: ipv4Initial ?? "",
    ipv6: ipv6Initial ?? "",
    vlan: vlanInitial != null ? String(vlanInitial) : "",
  });

  // Form is keyed by mgmtId at the parent — remount resets state on switch.
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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleConfirmDelete() {
    if (mgmtId == null) return;
    setConfirmOpen(false);
    try {
      await deleteMgmtDomain(mgmtId, token);
      clearForm();
      onDelete(mgmtId);
    } catch (error) {
      setErrors(await extractErrors(error));
    }
  }

  async function handleUpdate() {
    if (mgmtId == null || !deviceA || !deviceB) return;
    try {
      await updateMgmtDomain(
        mgmtId,
        {
          device_a: deviceA,
          device_b: deviceB,
          ipv4_gw: ipv4,
          ipv6_gw: ipv6,
          vlan: Number.parseInt(vlan, 10),
        },
        token,
      );
      clearForm();
      onUpdate(mgmtId);
    } catch (error) {
      setErrors(await extractErrors(error));
    }
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
                  value={ipv4}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_update_ipv6_input"
                  label="IPv6 Gateway"
                  name="ipv6"
                  type="text"
                  value={ipv6}
                  onChange={handleChange}
                />
              </FormField>

              <FormField>
                <FormInput
                  id="mgmt_update_vlan_input"
                  label="VLAN ID"
                  name="vlan"
                  type="text"
                  value={vlan}
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
        <Button color="black" onClick={handleCancel}>
          Cancel
        </Button>
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
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDeleteMgmtId(e.target.value)
            }
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
