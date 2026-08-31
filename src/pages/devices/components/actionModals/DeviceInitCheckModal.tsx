import {
  Icon,
  Modal,
  Accordion,
  type AccordionTitleProps,
} from "semantic-ui-react";
import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect, useState, type ReactNode } from "react";

import { initCheckDevice, type InitCheckResult } from "../../api/deviceListApi";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { extractErrorMessageAsync } from "../../../../utils/extractErrorMessage";
import type { DeviceType } from "../../../../types/device";

type DeviceInitCheckModalProps = {
  readonly disabled?: boolean;
  readonly submitInit: () => void;
  readonly deviceId: number;
  readonly hostname: string;
  readonly deviceType: DeviceType;
  readonly mlagPeerHostname?: string | null;
  readonly mlagPeerId?: number | null;
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
}: DeviceInitCheckModalProps) {
  const [initcheckOutput, setInitcheckOutput] = useState<InitCheckOutput>(null);
  const [accordionActiveIndex, setAccordionActiveIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { token } = useAuthToken();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const payload = {
      hostname,
      device_type: deviceType,
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

  const accordionClick = (
    _e: React.MouseEvent<HTMLDivElement>,
    titleProps: AccordionTitleProps,
  ) => {
    const { index } = titleProps;
    setAccordionActiveIndex((prevIndex) =>
      prevIndex === index ? -1 : Number(index),
    );
  };

  let initcheckHtml: ReactNode = <Icon name="spinner" loading />;
  let initcheckOk = false;
  if (initcheckOutput !== null && typeof initcheckOutput !== "string") {
    try {
      initcheckOk = Boolean(initcheckOutput.compatible);
      let compatibleLinknets = 0;
      let linknets: ReactNode = "";
      try {
        compatibleLinknets = initcheckOutput.linknets?.length ?? 0;
        linknets = (
          <pre>{JSON.stringify(initcheckOutput.linknets, null, 2)}</pre>
        );
      } catch {
        if (initcheckOutput.linknets_error) {
          linknets = initcheckOutput.linknets_error;
        }
      }
      let compatibleNeighbors = 0;
      let neighbors: ReactNode = "";
      try {
        compatibleNeighbors = initcheckOutput.neighbors?.length ?? 0;
        neighbors = (
          <pre>{JSON.stringify(initcheckOutput.neighbors, null, 2)}</pre>
        );
      } catch {
        if (initcheckOutput.neighbors_error) {
          neighbors = initcheckOutput.neighbors_error;
        }
      }

      initcheckHtml = (
        <Accordion>
          <Accordion.Title
            active={accordionActiveIndex === 1}
            index={1}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            Linknets: {compatibleLinknets}
            <Icon
              name={
                initcheckOutput.linknets_compatible ? "checkmark" : "cancel"
              }
            />
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 1}>
            {linknets}
          </Accordion.Content>
          <Accordion.Title
            active={accordionActiveIndex === 2}
            index={2}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            Compatible neighbors: {compatibleNeighbors}
            <Icon
              name={
                initcheckOutput.neighbors_compatible ? "checkmark" : "cancel"
              }
            />
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 2}>
            {neighbors}
          </Accordion.Content>
          <Accordion.Title
            active={accordionActiveIndex === 3}
            index={3}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            Detailed output
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 3}>
            <pre>{JSON.stringify(initcheckOutput, null, 2)}</pre>
          </Accordion.Content>
        </Accordion>
      );
    } catch {
      initcheckHtml = <pre>{JSON.stringify(initcheckOutput, null, 2)}</pre>;
    }
  } else if (typeof initcheckOutput === "string") {
    initcheckHtml = <pre>{initcheckOutput}</pre>;
  }

  return (
    <Modal
      onClose={() => setIsOpen(false)}
      open={isOpen}
      trigger={
        <Button
          variant="contained"
          disabled={disabled || submitting}
          endIcon={submitting ? <SettingsIcon /> : <OpenInNewIcon />}
          onClick={() => setIsOpen(true)}
        >
          {submitting ? "Initializing..." : "Initialize..."}
        </Button>
      }
    >
      <Modal.Header>Init compatability check</Modal.Header>
      <Modal.Content>
        <Modal.Description>{initcheckHtml}</Modal.Description>
      </Modal.Content>
      <Modal.Actions>
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
            setSubmitting(true);
            setIsOpen(false);
            submitInit();
          }}
          disabled={!initcheckOk}
        >
          Start initialization
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
