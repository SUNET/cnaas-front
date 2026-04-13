import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { Button, Icon, Popup } from "semantic-ui-react";
import {
  getSecondsUntilExpiry,
  useAuthToken,
} from "../../contexts/AuthTokenContext";
import { secondsToText } from "../../utils/formatters";

export function JwtInfo() {
  const { doTokenRefresh, logout, username, token, tokenExpiry } =
    useAuthToken();
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(() =>
    getSecondsUntilExpiry(tokenExpiry),
  );
  const [prevTokenExpiry, setPrevTokenExpiry] = useState(tokenExpiry);
  const timerId = useRef();

  // Reset countdown when tokenExpiry changes (e.g. token refresh)
  if (tokenExpiry !== prevTokenExpiry) {
    setPrevTokenExpiry(tokenExpiry);
    setSecondsUntilExpiry(getSecondsUntilExpiry(tokenExpiry));
  }

  useEffect(() => {
    if (tokenExpiry === null || tokenExpiry === undefined) {
      return;
    }

    if (getSecondsUntilExpiry(tokenExpiry) > 0) {
      timerId.current = setInterval(() => {
        const remaining = getSecondsUntilExpiry(tokenExpiry);
        setSecondsUntilExpiry(remaining);
        if (remaining <= 0) {
          clearInterval(timerId.current);
        }
      }, 5000);
    }

    return () => {
      clearInterval(timerId.current);
    };
  }, [tokenExpiry]);

  return (
    <Popup
      key="profile"
      hoverable
      content={
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
          <Popup
            content="Copy JWT (to use from curl etc), take note of valid time listed above"
            trigger={
              <Button
                onClick={() => navigator.clipboard.writeText(token)}
                icon="copy"
                size="tiny"
              />
            }
            position="bottom right"
          />
          <Popup
            content="Try to refresh the access token now, if it can't be refresh automatically you will be asked to log in again"
            trigger={
              <Button onClick={doTokenRefresh} icon="refresh" size="tiny" />
            }
            position="bottom right"
          />
          <Popup
            content="Make changes to user settings for this browser session"
            trigger={
              <NavLink
                end
                className={({ isActive }) => (isActive ? "active" : undefined)}
                to="/settings"
                key="settings"
              >
                <Button
                  icon="settings"
                  size="tiny"
                  color={
                    process.env.NETBOX_API_URL &&
                    !localStorage.getItem("netboxToken")
                      ? "orange"
                      : null
                  }
                />
              </NavLink>
            }
            position="bottom right"
          />
          <p key="logout">
            <Button onClick={logout}>Log out</Button>
          </p>
        </>
      }
      trigger={<Icon name="user circle" size="big" />}
      wide
    />
  );
}
