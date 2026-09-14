import HelpIcon from "@mui/icons-material/Help";
import { Box, Container, Paper, TextField, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Switch from "@mui/material/Switch";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Tooltip } from "../../components/Tooltip";

type SettingsForm = {
  netboxToken: string;
  distPortConfig: boolean;
};

export function Settings() {
  const [formData, setFormData] = useState<SettingsForm>({
    netboxToken: localStorage.getItem("netboxToken") ?? "",
    distPortConfig: localStorage.getItem("distPortConfig") === "true",
  });
  const [hasSavedNetboxToken, setHasSavedNetboxToken] = useState(
    Boolean(localStorage.getItem("netboxToken")),
  );
  const { netboxToken, distPortConfig } = formData;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, netboxToken: event.target.value }));
  }

  function handleCheckboxChange(checked: boolean) {
    setFormData((prev) => ({ ...prev, distPortConfig: checked }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem("netboxToken", netboxToken);
    localStorage.setItem("distPortConfig", String(distPortConfig));
    setHasSavedNetboxToken(Boolean(netboxToken));
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={4} sx={{ m: 2, p: 4 }}>
        <Typography component="h1" variant="h3" sx={{ textAlign: "center" }}>
          User Settings
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          {process.env.NETBOX_API_URL && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                label="Netbox API token"
                placeholder="Enter Netbox API token"
                name="netboxToken"
                type="text"
                value={netboxToken}
                onChange={handleChange}
                fullWidth
              />
              <Tooltip
                title={
                  <>
                    Provide Netbox API token to allow read-write access
                    <a href={`${process.env.NETBOX_API_URL}/user/api-tokens/`}>
                      Netbox API tokens
                    </a>
                  </>
                }
              >
                <HelpIcon
                  fontSize="small"
                  color={hasSavedNetboxToken ? "inherit" : "warning"}
                  sx={{ flexShrink: 0 }}
                />
              </Tooltip>
            </Box>
          )}

          <FormGroup sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  name="distPortConfig"
                  checked={distPortConfig}
                  onChange={(e) => handleCheckboxChange(e.target.checked)}
                />
              }
              label='Enable experimental "configure ports" on DIST action dropdown menu'
            />
          </FormGroup>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 1 }}
          >
            Save
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
