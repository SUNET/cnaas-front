import React, { useState } from "react";
import {
  FormInput,
  FormGroup,
  Button,
  Form,
  Icon,
  Container,
  Popup,
} from "semantic-ui-react";

function Settings() {
  const [formData, setFormData] = useState({
    netboxToken: localStorage.getItem("netboxToken") || "",
  });
  const { netboxToken } = formData;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    localStorage.setItem("netboxToken", netboxToken);
  }

  let netboxField = null;
  if (process.env.NETBOX_API_URL) {
    netboxField = (
      <>
        <FormInput
          label={
            <p>
              Netbox API token
              <Popup
                content={`Provide Netbox API token from ${process.env.NETBOX_API_URL}`}
                wide
                trigger={
                  <Icon
                    name="question circle"
                    color={
                      !localStorage.getItem("netboxToken") ? "orange" : null
                    }
                  />
                }
              />
            </p>
          }
          name="netboxToken"
          type="text"
          value={netboxToken || ""}
          onChange={handleChange}
        />
      </>
    );
  }

  return (
    <div className="container">
      <Container>
        <h1>User Settings</h1>
        <Form>
          <FormGroup>{netboxField}</FormGroup>
        </Form>
        <Button type="submit" onClick={handleSave} color="green">
          Save
        </Button>
      </Container>
    </div>
  );
}

export default Settings;
