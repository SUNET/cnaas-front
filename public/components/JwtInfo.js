import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Icon, Popup } from "semantic-ui-react";
import {
  getSecondsUntilExpiry,
  useAuthToken,
} from "../contexts/AuthTokenContext";

function JwtInfo() {
  const { doTokenRefresh, logout, username, token } = useAuthToken();
  const [tokenExpired, setTokenExpired] = useState(true);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(
    useMemo(() => getSecondsUntilExpiry(token), [token]),
  );

  const timerId = useRef();

  useEffect(() => {
    const tokenSecsRemaining = getSecondsUntilExpiry(token);
    setSecondsUntilExpiry(tokenSecsRemaining);
    setTokenExpired(tokenSecsRemaining <= 0);

    timerId.current = setInterval(() => {
      setSecondsUntilExpiry((prev) => prev - 5);
    }, 5000);

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
              ? `Token expired ${Math.round(Math.abs(secondsUntilExpiry) / 60)} minutes ago`
              : `Token valid for ${Math.round(Math.abs(secondsUntilExpiry) / 60)} more minutes`}
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
