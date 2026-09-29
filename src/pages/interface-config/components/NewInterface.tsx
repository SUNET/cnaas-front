import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";

export function NewInterfaceModal({
  suggestedInterfaces,
  addNewInterface,
}: {
  readonly suggestedInterfaces: string[];
  readonly addNewInterface: (interfaceName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [interfaceName, setInterfaceName] = useState("");

  const handleAdd = () => {
    if (interfaceName) addNewInterface(interfaceName);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        endIcon={<OpenInNewIcon />}
        onClick={() => setOpen(true)}
      >
        Add new interface...
      </Button>
      <Dialog
        aria-labelledby="new-interface-dialog"
        aria-describedby="new-interface-dialog-description"
        onClose={() => setOpen(false)}
        open={open}
      >
        <DialogTitle id="new-interface-dialog">Add new interface</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText id="new-interface-dialog-description">
              Select or type an interface name:
            </DialogContentText>
            <Autocomplete
              freeSolo
              fullWidth
              options={suggestedInterfaces}
              value={interfaceName}
              onChange={(_, newValue) => setInterfaceName(newValue ?? "")}
              onInputChange={(_, newInputValue) =>
                setInterfaceName(newInputValue)
              }
              renderInput={(params) => (
                <TextField {...params} label="Select interface" />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button variant="contained" color="success" onClick={handleAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
