import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  FormInput,
  FormGroup,
  Button,
  Form,
  Container,
  Checkbox,
  type InputOnChangeData,
  type CheckboxProps,
} from "semantic-ui-react";
import { NmsTooltip } from "../../components/NmsTooltip";
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

  function handleCheckboxChange(
    _event: FormEvent<HTMLInputElement>,
    data: CheckboxProps,
  ) {
    setFormData((prev) => ({ ...prev, distPortConfig: data.checked ?? false }));
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
            <NmsTooltip
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
            </NmsTooltip>
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
            <Checkbox
              key="distPortConfig"
              name="distPortConfig"
              toggle
              label='Enable experimental "configure ports" on DIST action dropdown menu'
              defaultChecked={distPortConfig}
              onChange={handleCheckboxChange}
            />
          </FormGroup>
        </Form>
        <Button type="submit" onClick={handleSave} color="green">
          Save
        </Button>
      </Container>
    </div>
  );
}
