import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Icon, Popup } from "semantic-ui-react";
import {
  getSecondsUntilExpiry,
  useAuthToken,
} from "../../contexts/AuthTokenContext";

const formatMMss = (secondsTotal) => {
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = String(secondsTotal % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

function JwtInfo() {
  const { doTokenRefresh, logout, username, token } = useAuthToken();
  const [tokenExpired, setTokenExpired] = useState(true);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(
    useMemo(() => getSecondsUntilExpiry(token), [token]),
  );

  const timerId = useRef();

  // Sets an interval
  useEffect(() => {
    const tokenSecsRemaining = getSecondsUntilExpiry(token);
    setSecondsUntilExpiry(tokenSecsRemaining);
    setTokenExpired(tokenSecsRemaining <= 0);

    if (tokenSecsRemaining) {
      timerId.current = setInterval(() => {
        setSecondsUntilExpiry((prev) => prev - 5);
      }, 5000);
    }

    return () => {
      clearInterval(timerId.current);
    };
  }, [token]);

  useEffect(() => {
    if (secondsUntilExpiry <= 0) {
      clearInterval(timerId.current);
      setTokenExpired(true);
    }
  }, [secondsUntilExpiry]);

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
          <p key="exp" className={tokenExpired ? "tokenexpired" : ""}>
            {tokenExpired
              ? `Token has expired!`
              : `Token time left ${formatMMss(secondsUntilExpiry)}`}
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

export default JwtInfo;
