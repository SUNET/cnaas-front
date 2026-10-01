import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useState, type ReactNode } from "react";

import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { DeviceType } from "../../../../types/device";
import { extractErrorMessageAsync } from "../../../../utils/extractErrorMessage";
import { initCheckDevice, type InitCheckResult } from "../../api/deviceListApi";

type DeviceInitCheckModalProps = {
  readonly disabled?: boolean;
  readonly submitInit: () => void;
  readonly deviceId: number;
  readonly hostname: string;
  readonly deviceType: DeviceType | null;
  readonly mlagPeerHostname?: string | null;
  readonly mlagPeerId?: number | null;
  readonly replaceHostname?: boolean;
};

type InitCheckOutput = InitCheckResult | string | null;

export function DeviceInitCheckModal({
  disabled = false,
  submitInit,
  deviceId,
  hostname,
  deviceType,
  mlagPeerHostname = null,
  mlagPeerId = null,
  replaceHostname = false,
}: DeviceInitCheckModalProps) {
  const [initcheckOutput, setInitcheckOutput] = useState<InitCheckOutput>(null);
  const [accordionActiveIndex, setAccordionActiveIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthToken();

  useEffect(() => {
    if (!isOpen || deviceType === null) return;

    let cancelled = false;
    const payload = {
      hostname,
      device_type: deviceType,
      replace_hostname: !!replaceHostname,
      ...(mlagPeerHostname !== null && mlagPeerId !== null
        ? { mlag_peer_hostname: mlagPeerHostname, mlag_peer_id: mlagPeerId }
        : {}),
    };

    async function runInitCheck() {
      try {
        const response = await initCheckDevice(deviceId, payload, token);
        if (!cancelled) setInitcheckOutput(response.data);
      } catch (error: unknown) {
        const message = await extractErrorMessageAsync(error);
        if (!cancelled) setInitcheckOutput(message);
      }
    }
    runInitCheck();

    return () => {
      cancelled = true;
      setInitcheckOutput(null);
      setAccordionActiveIndex(0);
    };
  }, [
    isOpen,
    deviceId,
    hostname,
    deviceType,
    mlagPeerHostname,
    mlagPeerId,
    token,
  ]);

  const handleAccordionChange = (index: number) => {
    setAccordionActiveIndex((prevIndex) => (prevIndex === index ? -1 : index));
  };

  let initcheckHtml: ReactNode = <CircularProgress />;
  let initcheckOk = false;
  if (initcheckOutput !== null && typeof initcheckOutput !== "string") {
    // Extract all data (and catch malformed-response errors) here, without
    // constructing any JSX: React doesn't render synchronously, so errors
    // thrown while building elements wouldn't be caught by try/catch anyway.
    let parseError = false;
    let compatibleLinknets = 0;
    let linknetsJson: string | null = null;
    let linknetsErrorText: string | undefined;
    let compatibleNeighbors = 0;
    let neighborsJson: string | null = null;
    let neighborsErrorText: string | undefined;

    try {
      initcheckOk = Boolean(initcheckOutput.compatible);

      try {
        compatibleLinknets = initcheckOutput.linknets?.length ?? 0;
        linknetsJson = JSON.stringify(initcheckOutput.linknets, null, 2);
      } catch {
        linknetsErrorText = initcheckOutput.linknets_error;
      }

      try {
        compatibleNeighbors = initcheckOutput.neighbors?.length ?? 0;
        neighborsJson = JSON.stringify(initcheckOutput.neighbors, null, 2);
      } catch {
        neighborsErrorText = initcheckOutput.neighbors_error;
      }
    } catch {
      parseError = true;
    }

    if (parseError) {
      initcheckHtml = <pre>{JSON.stringify(initcheckOutput, null, 2)}</pre>;
    } else {
      const linknets: ReactNode =
        linknetsJson !== null ? <pre>{linknetsJson}</pre> : linknetsErrorText;
      const neighbors: ReactNode =
        neighborsJson !== null ? (
          <pre>{neighborsJson}</pre>
        ) : (
          neighborsErrorText
        );

      initcheckHtml = (
        <>
          <Accordion
            expanded={accordionActiveIndex === 1}
            onChange={() => handleAccordionChange(1)}
          >
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              Linknets: {compatibleLinknets}
              {initcheckOutput.linknets_compatible ? (
                <CheckIcon sx={{ color: "success.main" }} />
              ) : (
                <CancelIcon sx={{ color: "error.main" }} />
              )}
            </AccordionSummary>
            <AccordionDetails>{linknets}</AccordionDetails>
          </Accordion>
          <Accordion
            expanded={accordionActiveIndex === 2}
            onChange={() => handleAccordionChange(2)}
          >
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              Compatible neighbors: {compatibleNeighbors}
              {initcheckOutput.neighbors_compatible ? (
                <CheckIcon sx={{ color: "success.main" }} />
              ) : (
                <CancelIcon sx={{ color: "error.main" }} />
              )}
            </AccordionSummary>
            <AccordionDetails>{neighbors}</AccordionDetails>
          </Accordion>
          <Accordion
            expanded={accordionActiveIndex === 3}
            onChange={() => handleAccordionChange(3)}
          >
            <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
              Detailed output
            </AccordionSummary>
            <AccordionDetails>
              <pre>{JSON.stringify(initcheckOutput, null, 2)}</pre>
            </AccordionDetails>
          </Accordion>
        </>
      );
    }
  } else if (typeof initcheckOutput === "string") {
    initcheckHtml = <pre>{initcheckOutput}</pre>;
  }

  return (
    <>
      <Button
        variant="contained"
        disabled={disabled || isLoading}
        loading={isLoading}
        onClick={() => setIsOpen(true)}
        sx={{ mb: 1 }}
      >
        Initialize
      </Button>
      <Dialog
        aria-labelledby="device-init-check-dialog"
        aria-describedby="device-init-check-dialog-description"
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <DialogTitle id="device-init-check-dialog">
          Init compatability check
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="device-init-check-dialog-description"
            component="div"
          >
            {initcheckHtml}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            key="cancel"
            variant="outlined"
            color="inherit"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            key="submit"
            variant="contained"
            color="success"
            onClick={() => {
              setIsLoading(true);
              setIsOpen(false);
              submitInit();
            }}
            disabled={!initcheckOk}
          >
            Start initialization
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
