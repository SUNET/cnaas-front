import { type SyntheticEvent, useState, type MouseEvent } from "react";
import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import ExpandCircleDownOutlinedIcon from "@mui/icons-material/ExpandCircleDownOutlined";
import { InterfaceCurrentConfig } from "./InterfaceCurrentConfig";

type ConfigColumnProps = {
  readonly interfaceName: string;
  readonly hostname: string | null;
  readonly config: string | undefined;
  readonly currentIfClass: string | null;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

export function ConfigColumn({
  interfaceName,
  hostname,
  config,
  currentIfClass,
  updateFieldData,
}: ConfigColumnProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <textarea
        name={`config|${interfaceName}`}
        defaultValue={config}
        rows={3}
        cols={50}
        hidden={currentIfClass !== "custom"}
        onChange={(e) =>
          updateFieldData(e, {
            name: `config|${interfaceName}`,
            value: e.target.value,
          })
        }
      />
      <IconButton
        size="small"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          setAnchorEl(e.currentTarget);
        }}
      >
        <ExpandCircleDownOutlinedIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box sx={{ p: 2 }}>
          <p>Current running config:</p>
          <InterfaceCurrentConfig
            hostname={hostname}
            interface={interfaceName}
          />
        </Box>
      </Popover>
    </>
  );
}
