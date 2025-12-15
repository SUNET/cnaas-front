import { Button, Icon, Modal, Accordion } from "semantic-ui-react";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import checkJsonResponse from "../../utils/checkJsonResponse";

function DeviceInitcheckModal({
  submitDisabled,
  submitText,
  submitIcon,
  submitInit,
  deviceId,
  hostname,
  device_type,
  mlag_init = false,
  mlag_peer_hostname = null,
  mlag_peer_id = null,
}) {
  const [initcheckOutput, setInitcheckOutput] = useState(null);
  const [accordionActiveIndex, setAccordionActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && initcheckOutput === null) {
      startInitCheck();
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

  function startInitCheck() {
    if (mlag_init) {
      initCheck(
        deviceId,
        hostname,
        device_type,
        mlag_peer_hostname,
        mlag_peer_id,
      );
    } else {
      initCheck(deviceId, hostname, device_type);
    }
  }

  async function initCheck() {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/device_initcheck/${deviceId}`;
    const dataToSend = {
      hostname,
      device_type,
    };
    if (mlag_peer_hostname !== null && mlag_peer_id !== null) {
      dataToSend.mlag_peer_hostname = mlag_peer_hostname;
      dataToSend.mlag_peer_id = mlag_peer_id;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials}`,
        },
        body: JSON.stringify(dataToSend),
      });
      const checkedResponse = await checkJsonResponse(response);
      setInitcheckOutput(checkedResponse.data);
    } catch (error) {
      setInitcheckOutput(error.message);
    }
  }

  let initcheckHtml = <Icon name="spinner" loading />;
  let initcheckOk = false;
  if (initcheckOutput !== null) {
    try {
      initcheckOk = initcheckOutput.compatible;
      let compatible_linknets = 0;
      let linknets = "";
      try {
        compatible_linknets = initcheckOutput.linknets.length;
        linknets = (
          <pre>{JSON.stringify(initcheckOutput.linknets, null, 2)}</pre>
        );
      } catch {
        if ("linknets_error" in initcheckOutput) {
          linknets = initcheckOutput.linknets_error;
        }
      }
      let compatible_neighbors = 0;
      let neighbors = "";
      try {
        compatible_neighbors = initcheckOutput.neighbors.length;
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
            Linknets: {compatible_linknets}
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
            Compatible neighbors: {compatible_neighbors}
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
      // onOpen={() => this.setState({ modal_open: true })}
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
  device_type: PropTypes.string,
  mlag_init: PropTypes.bool,
  mlag_peer_hostname: PropTypes.string,
  mlag_peer_id: PropTypes.number,
};

export default DeviceInitcheckModal;
