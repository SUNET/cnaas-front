import Prism from "prismjs";
import "prismjs/components/prism-log.js";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Grid,
  GridColumn,
  Input,
  Modal,
  ModalActions,
  ModalContent,
  ModalHeader,
  Popup,
  Ref,
} from "semantic-ui-react";

import "../styles/prism.css";
import PropTypes from "prop-types";

const highlightLogs = (logs) => {
  if (!logs || logs.length === 0) return "";
  return Prism.highlight(logs.join(""), Prism.languages.log, "log");
};

function ExpanedLogViewer({ logs, open, setOpen }) {
  const [localLogs, setLocalLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [filteredHtml, setFilteredHtml] = useState(null);

  const codeRef = useRef(null);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (!logs || !Array.isArray(logs)) return;
    setLocalLogs(logs);
  }, [logs]);

  useEffect(() => {
    const filteredLogs = localLogs.filter((value) =>
      value.includes(activeFilter),
    );
    const filteredHtml = highlightLogs(filteredLogs);

    setFilteredHtml(filteredHtml);
  }, [localLogs, activeFilter]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [open, filteredHtml]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      closeOnDimmerClick
      size="fullscreen"
    >
      <ModalHeader>
        <Grid>
          <GridColumn floated="left">Logs</GridColumn>
          <GridColumn floated="right" width={3}>
            <Input
              onChange={(e, data) => {
                //Set filter directly
                setFilter(data.value);
                // Clear previous debounce
                if (debounceTimeout.current)
                  clearTimeout(debounceTimeout.current);

                // Set new debounce
                debounceTimeout.current = setTimeout(() => {
                  setActiveFilter(data.value);
                }, 250);
              }}
              value={filter}
              placeholder="Filter"
              size="mini"
              fluid
            />
          </GridColumn>
        </Grid>
      </ModalHeader>
      <Ref innerRef={codeRef}>
        <ModalContent scrolling className="log-viewer-modal-content">
          <pre className="language-log expand-log-viewer">
            <code
              className="language-log text-wrap"
              dangerouslySetInnerHTML={{ __html: filteredHtml }}
            />
          </pre>
        </ModalContent>
      </Ref>
      <ModalActions>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </ModalActions>
    </Modal>
  );
}
ExpanedLogViewer.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.string),
  open: PropTypes.bool,
  setOpen: PropTypes.func,
};

function LogViewer({ logs }) {
  const [open, setOpen] = useState(false);
  const [localLogs, setLocalLogs] = useState([]);
  const [html, setHtml] = useState(null);

  const codeRef = useRef(null);

  useEffect(() => {
    const html = highlightLogs(localLogs);
    setHtml(html);
  }, [localLogs]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [html]);

  useEffect(() => {
    if (!logs || !Array.isArray(logs)) return;
    setLocalLogs(logs);
  }, [logs]);

  if (localLogs.length === 0) {
    return;
  }

  return (
    <>
      <ExpanedLogViewer logs={logs} open={open} setOpen={setOpen} />
      <div className="div-inline-log-viewer">
        <pre ref={codeRef} className="language-log inline-log-viewer">
          <code
            className="language-log text-wrap"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <Popup
            content="Expand logs"
            trigger={
              <Button
                onClick={() => setOpen((prev) => !prev)}
                className="button-expand-log-viewer"
                icon="expand"
                basic
                size="tiny"
              />
            }
          />
        </pre>
      </div>
    </>
  );
}

LogViewer.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.string),
};

export default LogViewer;
