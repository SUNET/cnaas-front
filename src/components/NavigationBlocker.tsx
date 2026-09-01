import { useBlocker } from "react-router";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

type NavigationBlockerProps = {
  readonly when: boolean;
  readonly message: string;
};

/**
 * Blocks navigation when `when` is true, showing a MUI Dialog instead of
 * window.confirm. This avoids the React scheduler conflict ("Should not
 * already be working") caused by unstable_usePrompt's synchronous
 * window.confirm call inside a React effect.
 */
export function NavigationBlocker({ when, message }: NavigationBlockerProps) {
  const blocker = useBlocker(when);

  return (
    <Dialog
      open={blocker.state === "blocked"}
      onClose={() => blocker.reset?.()}
      transitionDuration={0}
    >
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => blocker.reset?.()}
        >
          Stay on page
        </Button>
        <Button variant="contained" onClick={() => blocker.proceed?.()}>
          Leave page
        </Button>
      </DialogActions>
    </Dialog>
  );
}
