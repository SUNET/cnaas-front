import Prism from "prismjs";
import "prismjs/components/prism-log.js";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Grid,
  GridColumn,
  Input,
  type InputOnChangeData,
  Modal,
  ModalActions,
  ModalContent,
  ModalHeader,
  Ref,
} from "semantic-ui-react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { Tooltip } from "./Tooltip";

import "../styles/prism.css";

const highlightLogs = (logs: readonly string[]): string => {
  if (logs.length === 0) return "";
  return Prism.highlight(logs.join(""), Prism.languages.log, "log");
};

type ExpandedLogViewerProps = {
  readonly logs: readonly string[];
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
};

function ExpanedLogViewer({ logs, open, setOpen }: ExpandedLogViewerProps) {
  const [filter, setFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const codeRef = useRef<HTMLElement>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeLogs: readonly string[] = Array.isArray(logs) ? logs : [];
  const filteredHtml = useMemo(() => {
    const filtered = safeLogs.filter((value) => value.includes(activeFilter));
    return highlightLogs(filtered);
  }, [safeLogs, activeFilter]);

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
              onChange={(_e: unknown, data: InputOnChangeData) => {
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
        <Button variant="contained" onClick={() => setOpen(false)}>
          Close
        </Button>
      </ModalActions>
    </Modal>
  );
}

type LogViewerProps = {
  readonly logs: readonly string[];
};

function LogViewer({ logs }: LogViewerProps) {
  const [open, setOpen] = useState(false);

  const codeRef = useRef<HTMLPreElement>(null);

  const safeLogs: readonly string[] = Array.isArray(logs) ? logs : [];
  const html = useMemo(() => highlightLogs(safeLogs), [safeLogs]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [html]);

  if (safeLogs.length === 0) {
    return null;
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

          <Tooltip title="Expand logs">
            <IconButton
              size="small"
              className="button-expand-log-viewer"
              onClick={() => setOpen((prev) => !prev)}
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </pre>
      </div>
    </>
  );
}

export default LogViewer;
