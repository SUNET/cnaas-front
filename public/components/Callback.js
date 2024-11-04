import React from "react";
import { Container } from "semantic-ui-react";
import "../styles/reset.css";
import "../styles/main.css";
import { getData } from "../utils/getData";

class Callback extends React.Component {
  errorMessage = "Please be patient, you will be logged in.";

  getPermissions = (token) => {
    this.setState({ loading: true, error: null });
    if (process.env.PERMISSIONS_DISABLED === "true") {
      return this.checkSuccess();
    } else {
      return getData(`${process.env.API_URL}/api/v1.0/auth/permissions`, token)
        .then((data) => {
          localStorage.setItem("permissions", JSON.stringify(data));
          this.errorMessage = "Permissions are retrieved.";
          this.checkSuccess();
        })
        .catch((error) => {
          this.errorMessage =
            "There is an error with collecting the permissions. Please try to reload this page or login again.";
          console.log(error);
        });
    }
  };

  checkSuccess = () => {
    if (
      (localStorage.hasOwnProperty("permissions") ||
        process.env.PERMISSIONS_DISABLED === "true") &&
      localStorage.hasOwnProperty("token")
    ) {
      this.errorMessage =
        "Everything is loaded, you should be sent to the homepage in a second.";
      this.setState({ loggedIn: true });
      window.location.replace("/");
      return true;
    }
    return false;
  };

  componentDidMount() {
    if (localStorage.hasOwnProperty("token") && this.checkSuccess()) {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.has("refresh_token")) {
      document.cookie = `REFRESH_TOKEN=${params.get(
        "refresh_token",
      )}; SameSite=None; Secure; HttpOnly; Path=/api/v1.0/auth/refresh`;
    }
    if (params.has("username")) {
      localStorage.setItem("username", params.get("username"));
    }
    if (params.has("token")) {
      // Add the token as a parameter in local storage and communicate with the user they are logged in
      // We don't check the validity of the token as this is done with every API call to get any information
      const token = params.get("token");
      localStorage.setItem("token", token);

      this.getPermissions(token).then(() => {
        this.errorMessage = "You're logged in.";
        window.location.replace("/");
      });
    } else {
      this.errorMessage = "Something went wrong. Retry the login.";
    }
  }

  render() {
    return (
      <div className="container">
        <Container>
          <p className="title error">{this.errorMessage}</p>
        </Container>
      </div>
    );
  }
}

export default Callback;
