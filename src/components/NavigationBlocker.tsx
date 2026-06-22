import { useBlocker } from "react-router";
import { Confirm } from "semantic-ui-react";

type NavigationBlockerProps = {
  readonly when: boolean;
  readonly message: string;
};

/**
 * Blocks navigation when `when` is true, showing a Semantic UI Confirm dialog
 * instead of window.confirm. This avoids the React scheduler conflict
 * ("Should not already be working") caused by unstable_usePrompt's synchronous
 * window.confirm call inside a React effect.
 */
export function NavigationBlocker({ when, message }: NavigationBlockerProps) {
  const blocker = useBlocker(when);

  return (
    <Confirm
      open={blocker.state === "blocked"}
      content={message}
      onCancel={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      cancelButton="Stay on page"
      confirmButton="Leave page"
    />
  );
}
