import {
  Button,
  Icon,
  Modal,
  Accordion,
  type AccordionTitleProps,
  type SemanticICONS,
} from "semantic-ui-react";
import { useEffect, useState, type ReactNode } from "react";

import { initCheckDevice } from "../../api/deviceListApi";
import { useAuthToken } from "../../../../contexts/AuthTokenContext";

interface DeviceInitCheckModalProps {
  readonly submitDisabled?: boolean;
  readonly submitText: string;
  readonly submitIcon?: SemanticICONS;
  readonly submitInit: () => void;
  readonly deviceId: number;
  readonly hostname: string;
  readonly deviceType: string;
  readonly mlagPeerHostname?: string | null;
  readonly mlagPeerId?: number | null;
}

interface InitCheckResult {
  readonly compatible?: boolean;
  readonly linknets?: readonly unknown[];
  readonly linknets_compatible?: boolean;
  readonly linknets_error?: string;
  readonly neighbors?: readonly unknown[];
  readonly neighbors_compatible?: boolean;
  readonly neighbors_error?: string;
}

type InitCheckOutput = InitCheckResult | string | null;

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Response) {
    try {
      const body = await error.clone().json();
      if (body && typeof body === "object" && "message" in body) {
        return String((body as { message: unknown }).message);
      }
      return JSON.stringify(body, null, 2);
    } catch {
      try {
        const text = await error.text();
        if (text) return text;
      } catch {
        /* ignore */
      }
      return `HTTP ${error.status} ${error.statusText}`;
    }
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function DeviceInitCheckModal({
  submitDisabled,
  submitText,
  submitIcon,
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
        if (!cancelled) setInitcheckOutput(response.data as InitCheckResult);
      } catch (error: unknown) {
        const message = await extractErrorMessage(error);
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
          disabled={submitDisabled}
          icon
          labelPosition="right"
          onClick={() => setIsOpen(true)}
        >
          {submitText}
          <Icon name={submitIcon} />
        </Button>
      }
    >
      <Modal.Header>Init compatability check</Modal.Header>
      <Modal.Content>
        <Modal.Description>{initcheckHtml}</Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button key="cancel" color="black" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button
          key="submit"
          onClick={() => {
            setIsOpen(false);
            submitInit();
          }}
          disabled={!initcheckOk}
          icon
          labelPosition="right"
          positive
        >
          Start initialization
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
