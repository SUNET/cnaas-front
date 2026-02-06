import { useEffect, useState } from "react";
import { Container, Grid, Popup } from "semantic-ui-react";
import { getResponse, getData } from "../utils/getData";
import { useAuthToken } from "../contexts/AuthTokenContext";
import DashboardLinkgrid from "./DashboardLinkgrid";
import { DashboardInterfaceStatus } from "./DashboardInterfacestatus";

function Dashboard() {
  const { token } = useAuthToken();

  const [initialized, setInitialized] = useState(false);
  const [commitInfo, setCommitInfo] = useState({});
  const [deviceCount, setDeviceCount] = useState({});
  const [systemVersion, setSystemVersion] = useState({});
  const [settingsInfo, setSettingsInfo] = useState("Unknown");
  const [templatesInfo, setTemplatesInfo] = useState("Unknown");

  const getRepoStatus = async (repoName) => {
    try {
      const resp = await getData(
        `${process.env.API_URL}/api/v1.0/repository/${repoName}`,
        token,
      );
      setCommitInfo((prev) => ({ ...prev, [repoName]: resp.data }));
    } catch {
      setCommitInfo({});
    }
  };

  const headerCount = (response) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    return totalCountHeader && !isNaN(totalCountHeader) ? totalCountHeader : -1;
  };

  const getDeviceCount = async (name, filter) => {
    try {
      const resp = await getResponse(
        `${process.env.API_URL}/api/v1.0/devices?${filter}`,
        token,
      );
      const count = headerCount(resp);

      setDeviceCount((prev) => ({ ...prev, [name]: count }));
    } catch {
      setDeviceCount({});
    }
  };

  const getSystemVersion = async () => {
    try {
      const resp = await getData(
        `${process.env.API_URL}/api/v1.0/system/version`,
        token,
      );
      setSystemVersion(resp.data);
    } catch {
      setSystemVersion({});
    }
  };

  useEffect(() => {
    if (initialized || !token) return;

    getRepoStatus("settings");
    getRepoStatus("templates");
    getDeviceCount("managed", "filter[state]=MANAGED");
    getDeviceCount(
      "unsynchronized",
      "filter[state]=MANAGED&filter[synchronized]=false",
    );
    getSystemVersion();
    setInitialized(true);
  }, [token]);

  useEffect(() => {
    // Update settingsInfo
    const repoDataRegex =
      /Commit (?<commit_id>\w+) (?<branch>[-a-zA-Z0-9._]+) by (?<name>.+) at (?<date>[0-9- :]+)/;
    let match = repoDataRegex.exec(commitInfo.settings);
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
      setSettingsInfo([
        "Settings (",
        branch,
        ") updated at ",
        match.groups.date.slice(0, -3),
        " by ",
        match.groups.name,
      ]);
    }

    // Update templatesInfo
    match = repoDataRegex.exec(commitInfo.templates);
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
      setTemplatesInfo([
        "Templates (",
        branch,
        ") updated at ",
        match.groups.date.slice(0, -3),
        " by ",
        match.groups.name,
      ]);
    }
  }, [commitInfo]);

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
              <a href="/devices?filter[state]=MANAGED">{deviceCount.managed}</a>
            </p>
            <p>
              Unsynchronized devices:{" "}
              <a href="/devices?filter[synchronized]=false">
                {deviceCount.unsynchronized}
              </a>
            </p>
          </Grid.Column>
          <Grid.Column width={8}>
            <p>
              <Popup
                content={`Detailed git commit version: ${systemVersion.git_version}`}
                position="top left"
                hoverable
                trigger={
                  <a
                    href="https://github.com/SUNET/cnaas-nms/releases"
                    alt="CNaaS-NMS github page"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CNaaS-NMS version: {systemVersion.version}
                  </a>
                }
              />
            </p>
          </Grid.Column>
        </Grid>
        <DashboardInterfaceStatus />
        <DashboardLinkgrid />
      </Container>
    </div>
  );
}

export default Dashboard;
