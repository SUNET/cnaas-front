import { Button, Icon, Modal, Accordion } from "semantic-ui-react";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { postData } from "../../utils/sendData";
import { useAuthToken } from "../../contexts/AuthTokenContext";

function DeviceInitcheckModal({
  submitDisabled,
  submitText,
  submitIcon,
  submitInit,
  deviceId,
  hostname,
  deviceType,
  mlagPeerHostname = null,
  mlagPeerId = null,
}) {
  const [initcheckOutput, setInitcheckOutput] = useState(null);
  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuthToken();

  useEffect(() => {
    if (isOpen && initcheckOutput === null) {
      initCheck();
    }
    return () => {
      setInitcheckOutput(null);
      setAccordionActiveIndex(0);
    };
  }, [isOpen]);

  const accordionClick = (e, titleProps) => {
    const { index } = titleProps;
    setAccordionActiveIndex((prevIndex) => (prevIndex === index ? -1 : index));
  };

  async function initCheck() {
    const url = `${process.env.API_URL}/api/v1.0/device_initcheck/${deviceId}`;
    const dataToSend = {
      hostname,
      device_type: deviceType,
    };
    if (mlagPeerHostname !== null && mlagPeerId !== null) {
      dataToSend.mlag_peer_hostname = mlagPeerHostname;
      dataToSend.mlag_peer_id = mlagPeerId;
    }

    try {
      const response = await postData(url, token, dataToSend);
      setInitcheckOutput(response.data);
    } catch (error) {
      setInitcheckOutput(error.message);
    }
  }

  let initcheckHtml = <Icon name="spinner" loading />;
  let initcheckOk = false;
  if (initcheckOutput !== null) {
    try {
      initcheckOk = initcheckOutput.compatible;
      let compatibleLinknets = 0;
      let linknets = "";
      try {
        compatibleLinknets = initcheckOutput.linknets.length;
        linknets = (
          <pre>{JSON.stringify(initcheckOutput.linknets, null, 2)}</pre>
        );
      } catch {
        if ("linknets_error" in initcheckOutput) {
          linknets = initcheckOutput.linknets_error;
        }
      }
      let compatibleNeighbors = 0;
      let neighbors = "";
      try {
        compatibleNeighbors = initcheckOutput.neighbors.length;
        neighbors = (
          <pre>{JSON.stringify(initcheckOutput.neighbors, null, 2)}</pre>
        );
      } catch {
        if ("neighbors_error" in initcheckOutput) {
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

DeviceInitcheckModal.propTypes = {
  submitDisabled: PropTypes.bool,
  submitText: PropTypes.string,
  submitIcon: PropTypes.string,
  submitInit: PropTypes.func.isRequired,
  deviceId: PropTypes.number,
  hostname: PropTypes.string,
  deviceType: PropTypes.string,
  mlagPeerHostname: PropTypes.string,
  mlagPeerId: PropTypes.number,
};

export default DeviceInitcheckModal;
