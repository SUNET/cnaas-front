import CheckIcon from "@mui/icons-material/Check";
import RemoveIcon from "@mui/icons-material/Remove";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type ChangeEvent } from "react";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { deleteMgmtDomain, updateMgmtDomain } from "../../api/deviceListApi";

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

type ConfirmDeleteDialogProps = {
  readonly mgmtId: number | null;
  readonly deviceA?: string | null;
  readonly deviceB?: string | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

// The confirm-id input's own state lives here rather than in the parent:
// MUI Dialog unmounts its content when `open` is false (no `keepMounted`),
// so this naturally resets every time the dialog is reopened.
function ConfirmDeleteDialog({
  mgmtId,
  deviceA,
  deviceB,
  open,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [deleteMgmtId, setDeleteMgmtId] = useState("");

  return (
    <Dialog
      aria-labelledby="update-mgmt-domain-confirm-dialog"
      aria-describedby="update-mgmt-domain-confirm-dialog-description"
      onClose={onClose}
      open={open}
    >
      <DialogTitle id="update-mgmt-domain-confirm-dialog">
        Delete Management Domain {mgmtId}
      </DialogTitle>
      <DialogContent id="update-mgmt-domain-confirm-dialog-description">
        <TextField
          id="mgmt_update_delete-input"
          value={deleteMgmtId}
          label="Confirm ID"
          type="string"
          required
          sx={{ mt: 1 }}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setDeleteMgmtId(e.target.value)
          }
          helperText={`Are you sure you want to delete managament domain ${mgmtId} with devices ${deviceA} and ${deviceB}?`}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={Number(deleteMgmtId) !== Number(mgmtId)}
          onClick={onConfirm}
        >
          Confirm Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
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
    <>
      <Dialog
        aria-labelledby="update-mgmt-domain-dialog"
        aria-describedby="update-mgmt-domain-dialog-description"
        onClose={handleCancel}
        open={isOpen}
      >
        <DialogTitle id="update-mgmt-domain-dialog">
          Management domain {mgmtId}
        </DialogTitle>
        <DialogContent id="update-mgmt-domain-dialog-description">
          <Stack spacing={2}>
            <span style={{ fontWeight: "lighter" }}>
              Devices in managament domain:{" "}
            </span>
            <span>{`${deviceA}  ${deviceB}`}</span>
            <TextField
              id="mgmt_update_ipv4_input"
              label="IPv4 Gateway"
              placeholder="Enter IPv4 Gateway"
              name="ipv4"
              type="text"
              value={ipv4}
              onChange={handleChange}
            />

            <TextField
              id="mgmt_update_ipv6_input"
              label="IPv6 Gateway"
              placeholder="Enter IPv6 Gateway"
              name="ipv6"
              type="text"
              value={ipv6}
              onChange={handleChange}
            />

            <TextField
              id="mgmt_update_vlan_input"
              label="VLAN ID"
              placeholder="Enter VLAN ID"
              name="vlan"
              type="text"
              value={vlan}
              onChange={handleChange}
            />
          </Stack>
          {!!errors.length && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <ul>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setConfirmOpen(true)}
            endIcon={<RemoveIcon />}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleUpdate}
            endIcon={<CheckIcon />}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        mgmtId={mgmtId}
        deviceA={deviceA}
        deviceB={deviceB}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
