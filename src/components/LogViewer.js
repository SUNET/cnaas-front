import Prism from "prismjs";
import "prismjs/components/prism-log.js";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Grid,
  GridColumn,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  Popup,
} from "semantic-ui-react";

import "../styles/prism.css";
import PropTypes from "prop-types";

const highlightLogs = (logs) => {
  if (!logs || logs.length === 0) return "";
  // return logs.map((line) => Prism.highlight(line, Prism.languages.log, "log"));
  return Prism.highlight(logs.join(""), Prism.languages.log, "log");
};

function ExpanedLogViewer({ logs, open, setOpen }) {
  const [localLogs, setLocalLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [filteredHtml, setFilteredHtml] = useState(null);

  const codeRef = useRef(null);

  useEffect(() => {
    if (!logs || !Array.isArray(logs)) return;
    setLocalLogs(logs);
  }, [logs]);

  useEffect(() => {
    const filteredLogs = localLogs.filter((value) => value.includes(filter));
    const filteredHtml = highlightLogs(filteredLogs);

    setFilteredHtml(filteredHtml);
  }, [localLogs, filter]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [filteredHtml]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      closeOnDimmerClick
      size="fullscreen"
      style={{ height: "95%" }}
    >
      <ModalHeader>
        <Grid>
          <GridColumn floated="left">Logs</GridColumn>
          <GridColumn floated="right" width={3}>
            <Input
              onChange={(e, data) => {
                setFilter(data.value);
              }}
              value={filter}
              placeholder="Filter"
              size="mini"
              fluid
            />
          </GridColumn>
        </Grid>
      </ModalHeader>
      <ModalContent style={{ height: "90%" }}>
        <pre
          ref={codeRef}
          className="language-log"
          style={{ lineHeight: "normal", height: "100%" }}
        >
          <code
            className="language-log"
            style={{ lineHeight: "normal", textWrap: "wrap" }}
            dangerouslySetInnerHTML={{ __html: filteredHtml }}
          />
        </pre>
      </ModalContent>
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
      <div style={{ position: "relative", maxHeight: "10em", margin: "1em" }}>
        <pre
          ref={codeRef}
          className="language-log"
          style={{
            lineHeight: "normal",
            minHeight: "4em",
            maxHeight: "10em",
            height: "100%",
            margin: "0",
            padding: 0,
          }}
        >
          <code
            className="language-log"
            style={{ lineHeight: "normal", textWrap: "wrap" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <Popup
            content="Expand logs"
            trigger={
              <Button
                onClick={() => setOpen((prev) => !prev)}
                icon="expand"
                basic
                size="tiny"
                style={{
                  position: "absolute",
                  bottom: "0.5rem",
                  right: "0.5rem",
                  margin: 0,
                }}
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
