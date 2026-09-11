import Prism from "prismjs";
import "prismjs/components/prism-log.js";
import { useEffect, useMemo, useRef, useState } from "react";

import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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

  const codeRef = useRef<HTMLPreElement>(null);
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
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <span>Logs</span>
          <TextField
            onChange={(e) => {
              //Set filter directly
              setFilter(e.target.value);
              // Clear previous debounce
              if (debounceTimeout.current)
                clearTimeout(debounceTimeout.current);

              // Set new debounce
              debounceTimeout.current = setTimeout(() => {
                setActiveFilter(e.target.value);
              }, 250);
            }}
            value={filter}
            placeholder="Filter"
            size="small"
          />
        </Stack>
      </DialogTitle>
      <DialogContent className="log-viewer-modal-content" dividers>
        <pre ref={codeRef} className="language-log expand-log-viewer">
          <code
            className="language-log text-wrap"
            dangerouslySetInnerHTML={{ __html: filteredHtml }}
          />
        </pre>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={() => setOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
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
      <Box className="div-inline-log-viewer" sx={{ position: "relative" }}>
        <pre ref={codeRef} className="language-log inline-log-viewer">
          <code
            className="language-log text-wrap"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <Box sx={{ position: "absolute", bottom: 1, right: 1 }}>
            <Tooltip title="Expand logs">
              <IconButton size="small" onClick={() => setOpen((prev) => !prev)}>
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </pre>
      </Box>
    </>
  );
}

export default LogViewer;
