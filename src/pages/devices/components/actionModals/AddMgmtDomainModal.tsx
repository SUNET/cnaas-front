import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { Device } from "../../../../types/device";
import { createMgmtDomain } from "../../api/deviceListApi";

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
  const [isLoading, setIsLoading] = useState(false);

  const { ipv4, ipv6, vlan } = formData;

  const isFormValid =
    Boolean(formData.deviceB) &&
    (Boolean(ipv4) || Boolean(ipv6)) &&
    Boolean(vlan) &&
    !Number.isNaN(Number.parseInt(vlan, 10));

  const deviceBOptions =
    deviceBCandidates?.map((device) => ({
      key: device.hostname,
      text: device.hostname,
    })) ?? [];

  function clearForm() {
    setErrors([]);
    setFormData(EMPTY_FORM);
  }

  async function handleAdd() {
    if (!deviceA) return;
    setIsLoading(true);
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
    setIsLoading(false);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelected(event: SelectChangeEvent) {
    setFormData((prev) => ({ ...prev, deviceB: event.target.value }));
  }

  function handleCancel() {
    clearForm();
    closeAction();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleAdd();
  }

  return (
    <Dialog
      aria-labelledby="add-mgmt-domain-dialog"
      aria-describedby="add-mgmt-domain-dialog-description"
      open={isOpen}
      onClose={handleCancel}
    >
      <DialogTitle id="add-mgmt-domain-dialog">
        Add Management Domain
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <DialogContentText
              id="add-mgmt-domain-dialog-description"
              sx={{ mb: 0 }}
            >
              Devices in management domain: {deviceA},
            </DialogContentText>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                id="mgmt-add-domain-b-select"
                aria-label="Device B"
                displayEmpty
                disabled={isLoading}
                name="domainB"
                value={formData.deviceB}
                onChange={handleSelected}
              >
                <MenuItem value="" disabled>
                  Select device
                </MenuItem>
                {deviceBOptions.map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.text}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Box
            component="form"
            id="add-mgmt-domain-form"
            onSubmit={handleSubmit}
          >
            <Stack spacing={2}>
              <TextField
                id="mgmt-add-ipv4-input"
                label="IPv4 Gateway"
                name="ipv4"
                type="text"
                value={ipv4}
                onChange={handleChange}
                disabled={isLoading}
                fullWidth
              />

              <TextField
                id="mgmt-add-ipv6-input"
                label="IPv6 Gateway"
                name="ipv6"
                type="text"
                value={ipv6}
                onChange={handleChange}
                disabled={isLoading}
                fullWidth
              />

              <TextField
                id="mgmt-add-vlan-input"
                label="VLAN ID"
                name="vlan"
                type="text"
                value={vlan}
                onChange={handleChange}
                disabled={isLoading}
                fullWidth
              />
            </Stack>
          </Box>
          {errors.length > 0 && (
            <Alert severity="error">
              <ul id="mgmt-add-error-list">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <ButtonGroup>
          <Button
            type="button"
            variant="outlined"
            onClick={handleCancel}
            endIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-mgmt-domain-form"
            variant="contained"
            color="success"
            loading={isLoading}
            endIcon={<CheckIcon />}
            disabled={!isFormValid || isLoading}
          >
            Add
          </Button>
        </ButtonGroup>
      </DialogActions>
    </Dialog>
  );
}
