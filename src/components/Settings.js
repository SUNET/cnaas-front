import React, { useState } from "react";
import {
  FormInput,
  FormGroup,
  Button,
  Form,
  Icon,
  Container,
  Popup,
  Checkbox,
} from "semantic-ui-react";

function Settings() {
  const [formData, setFormData] = useState({
    netboxToken: localStorage.getItem("netboxToken") || "",
    distPortConfig: localStorage.getItem("distPortConfig") || false,
  });
  const { netboxToken, distPortConfig } = formData;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(event, data) {
    const { name } = data;
    const value = data.checked;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSave() {
    localStorage.setItem("netboxToken", netboxToken);
    localStorage.setItem("distPortConfig", distPortConfig);
  }

  let netboxField = null;
  if (process.env.NETBOX_API_URL) {
    netboxField = (
      <FormInput
        label={
          <p>
            Netbox API token
            <Popup
              wide
              hoverable
              trigger={
                <Icon
                  name="question circle"
                  color={!localStorage.getItem("netboxToken") ? "orange" : null}
                />
              }
            >
              Provide Netbox API token to allow read-write access
              <a href={`${process.env.NETBOX_API_URL}/user/api-tokens/`}>
                Netbox API tokens
              </a>
            </Popup>
          </p>
        }
        name="netboxToken"
        type="text"
        value={netboxToken || ""}
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
              defaultChecked={JSON.parse(distPortConfig)}
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

export default Settings;
