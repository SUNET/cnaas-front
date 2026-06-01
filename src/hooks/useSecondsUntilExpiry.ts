import { useEffect, useRef, useState } from "react";

import { getSecondsUntilExpiry } from "../stores/AuthTokenContext";

/**
 * Tracks the number of seconds until `tokenExpiry`, refreshing every 5 seconds.
 *
 * Returns `null` when the token has no expiry (e.g. a token without an `exp`
 * claim), and counts down to `0` once it expires. The countdown resets whenever
 * `tokenExpiry` changes (e.g. after a token refresh).
 */
export function useSecondsUntilExpiry(
  tokenExpiry: number | null | undefined,
): number | null {
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState(() =>
    getSecondsUntilExpiry(tokenExpiry),
  );
  const [prevTokenExpiry, setPrevTokenExpiry] = useState(tokenExpiry);
  const timerId = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Reset countdown when tokenExpiry changes (e.g. token refresh)
  if (tokenExpiry !== prevTokenExpiry) {
    setPrevTokenExpiry(tokenExpiry);
    setSecondsUntilExpiry(getSecondsUntilExpiry(tokenExpiry));
  }

  useEffect(() => {
    if (tokenExpiry === null || tokenExpiry === undefined) {
      return undefined;
    }

    const secondsLeft = getSecondsUntilExpiry(tokenExpiry);
    if (secondsLeft !== null && secondsLeft > 0) {
      timerId.current = setInterval(() => {
        const remaining = getSecondsUntilExpiry(tokenExpiry);
        setSecondsUntilExpiry(remaining);
        if (remaining === null || remaining <= 0) {
          clearInterval(timerId.current);
        }
      }, 5000);
    }

    return () => {
      clearInterval(timerId.current);
    };
  }, [tokenExpiry]);

  return secondsUntilExpiry;
}
