import PropTypes from "prop-types";
import { useBlocker } from "react-router";
import { Confirm } from "semantic-ui-react";

NavigationBlocker.propTypes = {
  when: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
};

/**
 * Blocks navigation when `when` is true, showing a Semantic UI Confirm dialog
 * instead of window.confirm. This avoids the React scheduler conflict
 * ("Should not already be working") caused by unstable_usePrompt's synchronous
 * window.confirm call inside a React effect.
 */
export function NavigationBlocker({ when, message }) {
  const blocker = useBlocker(when);

  return (
    <Confirm
      open={blocker.state === "blocked"}
      content={message}
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
      cancelButton="Stay on page"
      confirmButton="Leave page"
    />
  );
}
