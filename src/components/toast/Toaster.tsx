import { useSyncExternalStore } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import { dismissToast, getSnapshot, subscribe } from "./toastStore";

const ToastStack = styled(Stack)(({ theme }) => ({
  position: "fixed",
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: theme.zIndex.snackbar,
  width: `calc(100% - ${theme.spacing(4)})`,
  maxWidth: `calc(100% - ${theme.spacing(4)})`,
  [theme.breakpoints.up("sm")]: {
    width: 400,
  },
}));

const ToastAlert = styled(Alert)(({ theme }) => ({
  boxShadow: theme.shadows[3],
}));

const ToastTitle = styled(AlertTitle)({
  fontWeight: 700,
});

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <ToastStack spacing={1}>
      {toasts.map((toast) => (
        <ToastAlert
          key={toast.id}
          severity={toast.severity}
          variant="standard"
          onClose={() => dismissToast(toast.id)}
        >
          <ToastTitle>{toast.title}</ToastTitle>
          {toast.message}
        </ToastAlert>
      ))}
    </ToastStack>
  );
}
