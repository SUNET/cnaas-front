
import React from "react";
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import checkResponseStatus from "../utils/checkResponseStatus";

class FirmwareCopyForm extends React.Component {
  state = {
      copyJobId: null,
      removeDisabled: false,
  };

  submitCopy(e) {
    e.preventDefault();
    console.log("copy submitted: "+this.props.filename);
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/firmware";
    let dataToSend = {
      url: process.env.FIRMWARE_REPO_URL+this.props.filename,
      sha1: this.props.sha1sum,
      verify_tls: true
    };

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
      console.log("firmware post response data", data);
      if (data.job_id !== undefined && typeof data.job_id === "number") {
        this.setState({
          copyJobId: data.job_id
        });
      } else {
        console.log("error when submitting firmware post job", data.job_id);
      }
    });
  }

  submitDelete(e) {
    e.preventDefault();
    console.log("remove submitted: "+this.props.filename);
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/firmware/" + this.props.filename;

    fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials}`
      }
    })
    .then(response => checkResponseStatus(response))
    .then(response => response.json())
    .then(data => {
      console.log("firmware delete response data", data);
      this.setState({
        removeDisabled: true
      });
    });
  }

  render() {
    let copyDisabled = false;
    if (this.state.copyJobId !== null) {
      copyDisabled = true;
    } else if (!this.props.sha1sum) {
      copyDisabled = true;
    }
    if (this.props.already_downloaded) {
      return (
        <form onSubmit={this.submitDelete.bind(this)}>
          <Button disabled={this.state.removeDisabled}>Delete <Icon name="trash alternate outline" /></Button>
        </form>
      );
    } else {
      return (
        <form onSubmit={this.submitCopy.bind(this)}>
          <Button disabled={copyDisabled}>Copy to NMS <Icon name="cloud download" /></Button>
        </form>
      );
    }
  }
}

FirmwareCopyForm.propTypes = {
  filename: PropTypes.string,
  sha1sum: PropTypes.string,
  already_downloaded: PropTypes.bool,
//  jobIdCallback: PropTypes.func
}

export default FirmwareCopyForm;