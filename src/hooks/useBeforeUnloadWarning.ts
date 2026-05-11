import { useEffect } from "react";

/**
 * Sets up a `beforeunload` warning when `enabled` is true.
 *
 * This complements <NavigationBlocker> (which handles in-app router navigation)
 * by also catching browser-level navigations: tab close, page refresh, or
 * typing a new URL in the address bar.
 */
export function useBeforeUnloadWarning(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers require a return value to trigger the prompt.
      event.returnValue = "";
      return "";
    };

    globalThis.addEventListener("beforeunload", handler);
    return () => globalThis.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
