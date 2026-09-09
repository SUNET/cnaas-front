import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { NavLink } from "react-router";
import { useSecondsUntilExpiry } from "../../hooks/useSecondsUntilExpiry";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { secondsToText } from "../../utils/formatters";
import { Tooltip } from "../Tooltip";

export function JwtInfo() {
  const { doTokenRefresh, logout, username, token, tokenExpiry } =
    useAuthToken();
  const secondsUntilExpiry = useSecondsUntilExpiry(tokenExpiry);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const settingsHighlighted =
    process.env.NETBOX_API_URL && !localStorage.getItem("netboxToken");

  return (
    <>
      <IconButton
        aria-label="Account"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <AccountCircleIcon fontSize="large" />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ padding: 2, minWidth: 280 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {username
              ? `Logged in as ${username}`
              : "Unknown user (username attribute missing)"}
          </Typography>
          <Typography
            color={
              secondsUntilExpiry !== null && secondsUntilExpiry <= 0
                ? "error"
                : undefined
            }
          >
            {secondsUntilExpiry === null && "Token does not expire."}
            {secondsUntilExpiry !== null &&
              secondsUntilExpiry <= 0 &&
              "Token has expired!"}
            {secondsUntilExpiry !== null &&
              secondsUntilExpiry > 0 &&
              `Token expires in ${secondsToText(secondsUntilExpiry)}.`}
          </Typography>
          <Stack direction="row" sx={{ marginTop: 1 }}>
            <Tooltip
              title="Copy JWT (to use from curl etc), take note of valid time listed above"
              placement="bottom-end"
            >
              <IconButton
                size="small"
                onClick={() => {
                  if (token) navigator.clipboard.writeText(token);
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Try to refresh the access token now, if it can't be refresh automatically you will be asked to log in again"
              placement="bottom-end"
            >
              <IconButton size="small" onClick={doTokenRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Make changes to user settings for this browser session"
              placement="bottom-end"
            >
              <NavLink
                end
                className={({ isActive }) => (isActive ? "active" : undefined)}
                to="/settings"
              >
                <IconButton
                  size="small"
                  color={settingsHighlighted ? "warning" : "default"}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </NavLink>
            </Tooltip>
          </Stack>
          <Divider sx={{ marginY: 1 }} />
          <Button
            color="secondary"
            variant="contained"
            fullWidth
            onClick={logout}
          >
            Log out
          </Button>
        </Box>
      </Popover>
    </>
  );
}
