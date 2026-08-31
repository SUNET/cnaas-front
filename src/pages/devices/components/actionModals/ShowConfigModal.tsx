import { useEffect, useState } from "react";
import {
  ButtonGroup,
  Loader,
  Modal,
  ModalActions,
  ModalContent,
  ModalDescription,
  ModalHeader,
  Grid,
  GridRow,
  GridColumn,
  Segment,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
} from "semantic-ui-react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import { Tooltip } from "../../../../components/Tooltip";
import {
  fetchGenerateConfig,
  fetchPreviousConfig,
  fetchRunningConfig,
} from "../../api/deviceListApi";
import { useAuthToken } from "../../../../stores/AuthTokenContext";
import { extractErrorMessageAsync } from "../../../../utils/extractErrorMessage";
import type { DeviceState } from "../../../../types/device";

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
  const [columnValues, setColumnValues] = useState({
    left: "running_config",
    right: "generate_config",
  });

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

  // Builds the menu children for a column dropdown. Children form is required
  // because semantic-ui-react's `options` prop expects option objects, not
  // rendered DropdownHeader/DropdownItem/DropdownDivider elements — those
  // belong inside <Dropdown.Menu>.
  function buildColumnItems(side: "left" | "right") {
    const selectColumn = (val: string) => {
      if (val.startsWith("previous_")) {
        const number = Number.parseInt(val.replace("previous_", ""), 10);
        getPreviousConfig(number);
      }
      if (val !== columnValues[side]) {
        setColumnValues((current) => ({ ...current, [side]: val }));
      }
    };
    const items = [
      <DropdownHeader key="device_header" content="Device config" />,
      <DropdownItem
        key="running_config"
        text="Running config"
        onClick={() => selectColumn("running_config")}
      />,
      <DropdownDivider key="divider" />,
      <DropdownHeader key="nms_header" content="NMS generated" />,
      <DropdownItem
        key="generate_config"
        text="Generate config from latest templates"
        onClick={() => selectColumn("generate_config")}
      />,
      <DropdownItem
        key="previous_0"
        text="Last syncto job generated config (0)"
        onClick={() => selectColumn("previous_0")}
      />,
      <DropdownItem
        key="previous_1"
        text="Second from last syncto job generated config (-1)"
        onClick={() => selectColumn("previous_1")}
      />,
      <DropdownItem
        key="previous_2"
        text="Third from last syncto job generated config (-2)"
        onClick={() => selectColumn("previous_2")}
      />,
      <DropdownItem
        key="previous_3"
        text="Fourth from last syncto job generated config (-3)"
        onClick={() => selectColumn("previous_3")}
      />,
      <DropdownItem
        key="available_variables"
        text="Available variables for templates"
        onClick={() => selectColumn("available_variables")}
      />,
    ];
    if (side === "right") {
      items.push(
        <DropdownDivider key="right_only_divider" />,
        <DropdownItem
          key="hide"
          text="Hide column"
          onClick={() => selectColumn("hide")}
        />,
      );
    }
    return items;
  }

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

  type ColumnContent = {
    headerText: string;
    config: string;
    status: LoadStatus;
    jobId: number;
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

  const columnContents = Object.entries(columnValues)
    .map(([colName, colValue]) => {
      const content = getColumnContent(colValue);
      if (!content) return null;
      const { headerText, config, status, jobId } = content;
      return (
        <GridColumn key={colName}>
          <h1>{headerText}</h1>
          <ButtonGroup>
            <Tooltip title={`Copy ${headerText}`} placement="bottom-end">
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(config)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {colValue.startsWith("previous_") && (
              <Tooltip title={`Copy Job ID #${jobId}`} placement="bottom-end">
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(String(jobId))}
                >
                  <FormatListNumberedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {colValue in columnRefreshFunctions && (
              <Tooltip title={`Refresh ${headerText}`} placement="bottom-end">
                <IconButton
                  size="small"
                  onClick={() => columnRefreshFunctions[colValue]()}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </ButtonGroup>
          <Segment>
            {status === "loading" ? (
              <Loader className="modalloader" active inline="centered" />
            ) : (
              <pre className="fullconfig">{config}</pre>
            )}
          </Segment>
        </GridColumn>
      );
    })
    .filter((node) => node !== null);

  return (
    <Modal open={isOpen} onClose={handleCancel} size="fullscreen">
      <ModalHeader>Show config for {hostname}</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <Segment>
            <Dropdown key="left" text="Left column" button>
              <Dropdown.Menu>{buildColumnItems("left")}</Dropdown.Menu>
            </Dropdown>
            <Dropdown key="right" text="Right column" button>
              <Dropdown.Menu>{buildColumnItems("right")}</Dropdown.Menu>
            </Dropdown>
          </Segment>
          <Grid columns="equal">
            <GridRow>{columnContents}</GridRow>
            <GridRow>
              <GridColumn>
                <ul id="error_list" style={{ color: "red" }}>
                  {errors.map((err) => (
                    <li key={err.message}>{err.message}</li>
                  ))}
                </ul>
              </GridColumn>
            </GridRow>
          </Grid>
        </ModalDescription>
      </ModalContent>
      <ModalActions>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleCancel}
          endIcon={<CloseIcon />}
        >
          Close
        </Button>
      </ModalActions>
    </Modal>
  );
}
