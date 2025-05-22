import React from "react";
import { Container, Grid, Popup } from "semantic-ui-react";
import { getResponse, getData } from "../utils/getData";

class Dashboard extends React.Component {
  state = {
    commitInfo: {},
    deviceCount: {},
    systemVersion: {},
  };

  componentDidMount() {
    this.getRepoStatus("settings");
    this.getRepoStatus("templates");
    this.getDeviceCount("managed", "filter[state]=MANAGED");
    this.getDeviceCount(
      "unsynchronized",
      "filter[state]=MANAGED&filter[synchronized]=false",
    );
    this.getSystemVersion();
  }

  getRepoStatus = (repo_name) => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/repository/${repo_name}`;
    const newCommitInfo = this.state.commitInfo;
    getData(url, credentials).then((data) => {
      // console.log("this should be data", data);
      newCommitInfo[repo_name] = data.data;
      {
        this.setState(
          {
            commitInfo: newCommitInfo,
          },
          () => {
            console.log("this is new state", this.state.commitInfo);
          },
        );
      }
    });
  };

  getDeviceCount(name, filter) {
    const credentials = localStorage.getItem("token");
    getResponse(
      `${process.env.API_URL}/api/v1.0/devices?${filter}`,
      credentials,
    )
      .then((response) => this.headerCount(response))
      .then((count) => {
        const { deviceCount } = this.state;
        deviceCount[name] = count;
        this.setState({
          deviceCount,
        });
      });
  }

  getSystemVersion = () => {
    const credentials = localStorage.getItem("token");
    const url = `${process.env.API_URL}/api/v1.0/system/version`;
    let newSystemVersion = this.state.systemVersion;
    getData(url, credentials).then((data) => {
      // console.log("this should be data", data);
      newSystemVersion = data.data;
      {
        this.setState(
          {
            systemVersion: newSystemVersion,
          },
          () => {
            console.log("system version", this.state.systemVersion);
          },
        );
      }
    });
  };

  headerCount = (response) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      return totalCountHeader;
    }
    return -1;
  };

  render() {
    // Commit 9f05c568adb70782937872e3d3d1cf15ad3f6b63 master by Dennis Wallberg at 2020-10-12 17:25:59+02:00
    let settingsInfo = "Unknown";
    let templatesInfo = "Unknown";
    const repoDataRegex =
      /Commit (?<commit_id>\w+) (?<branch>[-a-zA-Z0-9._]+) by (?<name>.+) at (?<date>[0-9- :]+)/;
    let match = repoDataRegex.exec(this.state.commitInfo.settings);
    if (match) {
      let { branch } = match.groups;
      if (process.env.SETTINGS_WEB_URL) {
        branch = (
          <a
            key="settings"
            href={process.env.SETTINGS_WEB_URL}
            target="_blank"
            rel="noreferrer"
          >
            {match.groups.branch}
          </a>
        );
      }
      settingsInfo = [
        "Settings (",
        branch,
        ") updated at ",
        match.groups.date.slice(0, -3),
        " by ",
        match.groups.name,
      ];
    }
    match = repoDataRegex.exec(this.state.commitInfo.templates);
    if (match) {
      let { branch } = match.groups;
      if (process.env.TEMPLATES_WEB_URL) {
        branch = (
          <a
            key="templates"
            href={process.env.TEMPLATES_WEB_URL}
            target="_blank"
            rel="noreferrer"
          >
            {match.groups.branch}
          </a>
        );
      }
      templatesInfo = [
        "Templates (",
        branch,
        ") updated at ",
        match.groups.date.slice(0, -3),
        " by ",
        match.groups.name,
      ];
    }
    console.log(this.state.deviceCount);

    return (
      <div>
        <Container>
          <Grid columns={2}>
            <Grid.Column width={8}>
              <p>{settingsInfo}</p>
              <p>{templatesInfo}</p>
            </Grid.Column>
            <Grid.Column width={8}>
              <p>
                Managed devices:{" "}
                <a href="/devices?filter[state]=MANAGED">
                  {this.state.deviceCount.managed}
                </a>
              </p>
              <p>
                Unsynchronized devices:{" "}
                <a href="/devices?filter[synchronized]=false">
                  {this.state.deviceCount.unsynchronized}
                </a>
              </p>
            </Grid.Column>
            <Grid.Column width={8}>
              <p>
                <Popup
                  content={`Detailed git commit version: ${this.state.systemVersion.git_version}`}
                  position="top left"
                  hoverable
                  trigger={
                    <a
                      href="https://github.com/SUNET/cnaas-nms/releases"
                      alt="CNaaS-NMS github page"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CNaaS-NMS version: {this.state.systemVersion.version}
                    </a>
                  }
                />
              </p>
            </Grid.Column>
          </Grid>
        </Container>
      </div>
    );
  }
}

export default Dashboard;
