import { useState, type ChangeEvent } from "react";
import {
  FormInput,
  FormGroup,
  Form,
  type InputOnChangeData,
} from "semantic-ui-react";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Container from "@mui/material/Container";
import { Tooltip } from "../../components/Tooltip";
import HelpIcon from "@mui/icons-material/Help";

type SettingsForm = {
  netboxToken: string;
  distPortConfig: boolean;
};

export function Settings() {
  const [formData, setFormData] = useState<SettingsForm>({
    netboxToken: localStorage.getItem("netboxToken") ?? "",
    distPortConfig: localStorage.getItem("distPortConfig") === "true",
  });
  const { netboxToken, distPortConfig } = formData;

  function handleChange(
    _event: ChangeEvent<HTMLInputElement>,
    data: InputOnChangeData,
  ) {
    setFormData((prev) => ({ ...prev, netboxToken: data.value }));
  }

  function handleCheckboxChange(checked: boolean) {
    setFormData((prev) => ({ ...prev, distPortConfig: checked }));
  }

  function handleSave() {
    localStorage.setItem("netboxToken", netboxToken);
    localStorage.setItem("distPortConfig", String(distPortConfig));
  }

  let netboxField = null;
  if (process.env.NETBOX_API_URL) {
    netboxField = (
      <FormInput
        label={
          <p>
            Netbox API token
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
                color={
                  localStorage.getItem("netboxToken") ? "inherit" : "warning"
                }
              />
            </Tooltip>
          </p>
        }
        name="netboxToken"
        type="text"
        value={netboxToken}
        onChange={handleChange}
      />
    );
  }

  return (
    <div className="container">
      <Container>
        <h1>User Settings</h1>
        <Form>
          <FormGroup>{netboxField}</FormGroup>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  name="distPortConfig"
                  defaultChecked={distPortConfig}
                  onChange={(e) => handleCheckboxChange(e.target.checked)}
                />
              }
              label='Enable experimental "configure ports" on DIST action dropdown menu'
            />
          </FormGroup>
        </Form>
        <Button
          type="submit"
          variant="contained"
          color="success"
          onClick={handleSave}
        >
          Save
        </Button>
      </Container>
    </div>
  );
}
