import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useState } from "react";

import { Tooltip } from "../../../../components/Tooltip";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import type { DeviceState } from "../../../../types/device";
import { extractErrorMessageAsync } from "../../../../utils/extractErrorMessage";
import {
  fetchGenerateConfig,
  fetchPreviousConfig,
  fetchRunningConfig,
} from "../../api/deviceListApi";

type ShowConfigModalProps = {
  readonly hostname: string | null;
  readonly state?: DeviceState | null;
  readonly isOpen: boolean;
  readonly closeAction: () => void;
};

type LoadStatus = "idle" | "loading" | "loaded" | "error";

type RunningConfigState = {
  readonly status: LoadStatus;
  readonly config: string;
  readonly error?: string;
};

type GeneratedConfigState = {
  readonly status: LoadStatus;
  readonly generated_config: string;
  readonly available_variables?: unknown;
  readonly error?: string;
};

type PreviousConfigEntry = {
  readonly status: LoadStatus;
  readonly config: string;
  readonly job_id: number;
  readonly error?: string;
};

const EMPTY_RUNNING: RunningConfigState = { status: "idle", config: "" };
const EMPTY_GENERATED: GeneratedConfigState = {
  status: "idle",
  generated_config: "",
};
const EMPTY_PREVIOUS_ENTRY: PreviousConfigEntry = {
  status: "idle",
  config: "",
  job_id: 0,
};
const EMPTY_PREVIOUS: Record<number, PreviousConfigEntry> = {
  0: EMPTY_PREVIOUS_ENTRY,
  1: EMPTY_PREVIOUS_ENTRY,
  2: EMPTY_PREVIOUS_ENTRY,
  3: EMPTY_PREVIOUS_ENTRY,
};

type ColumnContent = {
  headerText: string;
  config: string;
  status: LoadStatus;
  jobId: number;
};

// Labels shared between the Select's menu items and its closed-state
// display (`renderValue`), so both stay in sync from one source.
const COLUMN_LABELS: Record<string, string> = {
  running_config: "Running config",
  generate_config: "Generate config from latest templates",
  previous_0: "Last syncto job generated config (0)",
  previous_1: "Second from last syncto job generated config (-1)",
  previous_2: "Third from last syncto job generated config (-2)",
  previous_3: "Fourth from last syncto job generated config (-3)",
  available_variables: "Available variables for templates",
};

const COLUMN_PICKER_LABELS: Record<"left" | "right", string> = {
  left: "Left column",
  right: "Right column",
};

function buildColumnMenuItems() {
  return [
    <ListSubheader key="device_header">Device config</ListSubheader>,
    <MenuItem key="running_config" value="running_config">
      {COLUMN_LABELS.running_config}
    </MenuItem>,
    <Divider key="divider" />,
    <ListSubheader key="nms_header">NMS generated</ListSubheader>,
    <MenuItem key="generate_config" value="generate_config">
      {COLUMN_LABELS.generate_config}
    </MenuItem>,
    <MenuItem key="previous_0" value="previous_0">
      {COLUMN_LABELS.previous_0}
    </MenuItem>,
    <MenuItem key="previous_1" value="previous_1">
      {COLUMN_LABELS.previous_1}
    </MenuItem>,
    <MenuItem key="previous_2" value="previous_2">
      {COLUMN_LABELS.previous_2}
    </MenuItem>,
    <MenuItem key="previous_3" value="previous_3">
      {COLUMN_LABELS.previous_3}
    </MenuItem>,
    <MenuItem key="available_variables" value="available_variables">
      {COLUMN_LABELS.available_variables}
    </MenuItem>,
  ];
}

type ColumnPaneProps = {
  readonly side: "left" | "right";
  readonly defaultValue: string;
  readonly getColumnContent: (colValue: string) => ColumnContent | null;
  readonly columnRefreshFunctions: Record<string, () => void>;
  readonly onSelectPrevious: (number: number) => void;
  readonly hidden?: boolean;
};

// One column pane: the picker Select at the top, followed by that
// column's header/actions/config body. When `hidden` (right side only,
// toggled via the "Show right column" checkbox in the dialog title), the
// pane is just `display: none`'d rather than unmounted, so its own
// selection isn't lost if the user shows it again.
function ColumnPane({
  side,
  defaultValue,
  getColumnContent,
  columnRefreshFunctions,
  onSelectPrevious,
  hidden = false,
}: ColumnPaneProps) {
  const [colValue, setColValue] = useState(defaultValue);
  const content = getColumnContent(colValue);
  const labelId = `${side}-column-label`;

  function handleChange(val: string) {
    if (val.startsWith("previous_")) {
      const number = Number.parseInt(val.replace("previous_", ""), 10);
      onSelectPrevious(number);
    }
    setColValue(val);
  }

  return (
    <Box
      sx={{ p: 2, flex: 1, minWidth: 0, display: hidden ? "none" : undefined }}
    >
      <FormControl size="small" sx={{ minWidth: 220, maxWidth: 320, mb: 1 }}>
        <InputLabel id={labelId}>{COLUMN_PICKER_LABELS[side]}</InputLabel>
        <Select
          labelId={labelId}
          label={COLUMN_PICKER_LABELS[side]}
          value={colValue}
          onChange={(event: SelectChangeEvent) =>
            handleChange(event.target.value)
          }
          renderValue={(val) => (
            <Box
              component="span"
              sx={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {COLUMN_LABELS[val] ?? val}
            </Box>
          )}
        >
          {buildColumnMenuItems()}
        </Select>
      </FormControl>
      {content && (
        <>
          <h1>{content.headerText}</h1>
          <ButtonGroup>
            <Tooltip
              title={`Copy ${content.headerText}`}
              placement="bottom-end"
            >
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(content.config)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {colValue.startsWith("previous_") && (
              <Tooltip
                title={`Copy Job ID #${content.jobId}`}
                placement="bottom-end"
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    navigator.clipboard.writeText(String(content.jobId))
                  }
                >
                  <FormatListNumberedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {colValue in columnRefreshFunctions && (
              <Tooltip
                title={`Refresh ${content.headerText}`}
                placement="bottom-end"
              >
                <IconButton
                  size="small"
                  onClick={() => columnRefreshFunctions[colValue]()}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </ButtonGroup>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {content.status === "loading" ? (
              <CircularProgress />
            ) : (
              <pre className="fullconfig">{content.config}</pre>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}

export function ShowConfigModal({
  hostname,
  state = "MANAGED",
  isOpen,
  closeAction,
}: ShowConfigModalProps) {
  const { token } = useAuthToken();
  const [runningConfig, setRunningConfig] =
    useState<RunningConfigState>(EMPTY_RUNNING);
  const [generatedConfig, setGeneratedConfig] =
    useState<GeneratedConfigState>(EMPTY_GENERATED);
  const [previousConfig, setPreviousConfig] =
    useState<Record<number, PreviousConfigEntry>>(EMPTY_PREVIOUS);
  const [errors, setErrors] = useState<readonly Error[]>([]);
  const [showRightColumn, setShowRightColumn] = useState(true);

  function clearForm() {
    setErrors([]);
    setRunningConfig(EMPTY_RUNNING);
    setGeneratedConfig(EMPTY_GENERATED);
  }

  function handleCancel() {
    clearForm();
    closeAction();
  }

  async function getRunningConfig(signal?: AbortSignal) {
    if (!hostname) return;
    setRunningConfig({ status: "loading", config: "" });
    try {
      const resp = await fetchRunningConfig(hostname, token, signal);
      if (signal?.aborted) return;
      setRunningConfig({ status: "loaded", config: resp.data.config });
    } catch (error: unknown) {
      if (signal?.aborted) return;
      const message = await extractErrorMessageAsync(error);
      const err = new Error(message);
      setErrors([err]);
      setRunningConfig({ status: "error", config: "", error: message });
    }
  }

  async function getGeneratedConfig(signal?: AbortSignal) {
    if (!hostname) return;
    setGeneratedConfig({ status: "loading", generated_config: "" });
    try {
      const resp = await fetchGenerateConfig(hostname, token, signal);
      if (signal?.aborted) return;
      setGeneratedConfig({
        status: "loaded",
        generated_config: resp.data.config.generated_config,
        available_variables: resp.data.config.available_variables,
      });
    } catch (error: unknown) {
      if (signal?.aborted) return;
      const message = await extractErrorMessageAsync(error);
      const err = new Error(message);
      setErrors([err]);
      setGeneratedConfig({
        status: "error",
        generated_config: "",
        error: message,
      });
    }
  }

  async function getPreviousConfig(number: number) {
    if (!hostname) return;
    setPreviousConfig((current) => ({
      ...current,
      [number]: { status: "loading", config: "", job_id: 0 },
    }));
    try {
      const resp = await fetchPreviousConfig(hostname, number, token);
      setPreviousConfig((current) => ({
        ...current,
        [number]: {
          status: "loaded",
          config: resp.data.config,
          job_id: resp.data.job_id,
        },
      }));
    } catch (error: unknown) {
      const message = await extractErrorMessageAsync(error);
      const err = new Error(message);
      setErrors([err]);
      setPreviousConfig((current) => ({
        ...current,
        [number]: {
          status: "error",
          config: "",
          job_id: 0,
          error: message,
        },
      }));
    }
  }

  // Fetch once on mount. Modal is keyed by hostname at the parent so it
  // remounts per device; AbortController cancels the in-flight fetch on
  // unmount so post-await `setX` is skipped on a dead component.
  useEffect(() => {
    if (!hostname) return undefined;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect; loading/loaded/error transitions are intentional
    if (state === "MANAGED") getRunningConfig(controller.signal);
    getGeneratedConfig(controller.signal);
    return () => controller.abort();
  }, []);

  const columnHeaders: Record<string, string> = {
    running_config: "Device running config",
    generate_config: "NMS generated config",
    available_variables: "Template variables",
  };

  const columnRefreshFunctions: Record<string, () => void> = {
    running_config: getRunningConfig,
    generate_config: getGeneratedConfig,
    available_variables: getGeneratedConfig,
  };

  function getColumnContent(colValue: string): ColumnContent | null {
    if (colValue === "running_config") {
      return {
        headerText: columnHeaders.running_config,
        config: runningConfig.config,
        status: runningConfig.status,
        jobId: 0,
      };
    }
    if (colValue === "generate_config") {
      return {
        headerText: columnHeaders.generate_config,
        config: generatedConfig.generated_config,
        status: generatedConfig.status,
        jobId: 0,
      };
    }
    if (colValue.startsWith("previous_")) {
      const number = Number.parseInt(colValue.replace("previous_", ""), 10);
      const entry = previousConfig[number] ?? EMPTY_PREVIOUS_ENTRY;
      return {
        headerText: `Previous ${number} job config`,
        config: entry.config,
        status: entry.status,
        jobId: entry.job_id,
      };
    }
    if (colValue === "available_variables") {
      return {
        headerText: columnHeaders.available_variables,
        config: JSON.stringify(generatedConfig.available_variables, null, 2),
        status: generatedConfig.status,
        jobId: 0,
      };
    }
    return null;
  }

  return (
    <Dialog
      aria-labelledby="show-config-dialog"
      aria-describedby="show-config-dialog-description"
      onClose={handleCancel}
      open={isOpen}
      fullScreen
      sx={{ m: 6 }}
    >
      <DialogTitle
        id="show-config-dialog"
        sx={{ display: "flex", alignItems: "center", gap: 2 }}
      >
        <Box sx={{ flex: 1 }}>Show config for {hostname}</Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={showRightColumn}
              onChange={(event) => setShowRightColumn(event.target.checked)}
            />
          }
          label="Show right column"
        />
      </DialogTitle>
      <DialogContent id="show-config-dialog-description">
        {!!errors.length && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul>
              {errors.map((err) => (
                <li key={err.message}>{err.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 2 }}>
          <ColumnPane
            side="left"
            defaultValue="running_config"
            getColumnContent={getColumnContent}
            columnRefreshFunctions={columnRefreshFunctions}
            onSelectPrevious={getPreviousConfig}
          />
          <ColumnPane
            side="right"
            defaultValue="generate_config"
            getColumnContent={getColumnContent}
            columnRefreshFunctions={columnRefreshFunctions}
            onSelectPrevious={getPreviousConfig}
            hidden={!showRightColumn}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleCancel}
          endIcon={<CloseIcon />}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
