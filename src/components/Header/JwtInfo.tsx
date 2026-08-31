import { NavLink } from "react-router";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { Tooltip } from "../Tooltip";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuthToken } from "../../stores/AuthTokenContext";
import { useSecondsUntilExpiry } from "../../hooks/useSecondsUntilExpiry";
import { secondsToText } from "../../utils/formatters";

export function JwtInfo() {
  const { doTokenRefresh, logout, username, token, tokenExpiry } =
    useAuthToken();
  const secondsUntilExpiry = useSecondsUntilExpiry(tokenExpiry);

  const settingsHighlighted =
    process.env.NETBOX_API_URL && !localStorage.getItem("netboxToken");

  return (
    <Tooltip
      key="profile"
      title={
        <>
          <p key="userinfo">
            {username
              ? `Logged in as ${username}`
              : "Unknown user (username attribute missing)"}
          </p>
          <p
            key="exp"
            className={
              secondsUntilExpiry !== null && secondsUntilExpiry <= 0
                ? "tokenexpired"
                : ""
            }
          >
            {secondsUntilExpiry === null && "Token does not expire."}
            {secondsUntilExpiry !== null &&
              secondsUntilExpiry <= 0 &&
              "Token has expired!"}
            {secondsUntilExpiry !== null &&
              secondsUntilExpiry > 0 &&
              `Token expires in ${secondsToText(secondsUntilExpiry)}.`}
          </p>
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
              key="settings"
            >
              <IconButton
                size="small"
                color={settingsHighlighted ? "warning" : "default"}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </NavLink>
          </Tooltip>
          <p key="logout">
            <Button variant="contained" onClick={logout}>
              Log out
            </Button>
          </p>
        </>
      }
    >
      <span>
        <AccountCircleIcon fontSize="large" />
      </span>
    </Tooltip>
  );
}
