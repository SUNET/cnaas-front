import { useEffect, useState, type ReactNode } from "react";
import { Container, Grid, Popup } from "semantic-ui-react";
import { useAuthToken } from "../../../stores/AuthTokenContext";
import { DashboardLinkgrid } from "../../../components/DashboardLinkgrid";
import {
  fetchRepoStatus,
  fetchDeviceCount,
  fetchSystemVersion,
  type SystemVersion,
} from "../api/dashboardApi";
import { DashboardInterfaceStatus } from "./DashboardInterfaceStatus";
import { DashboardNetboxTenant } from "./DashboardNetboxTenant";

const REPO_DATA_REGEX =
  /Commit (?<commit_id>\w+) (?<branch>[-a-zA-Z0-9._]+) by (?<name>.+) at (?<date>[0-9- :]+)/;

function buildRepoInfo(
  label: string,
  commit: string | undefined,
  webUrl: string | undefined,
): ReactNode {
  if (!commit) return null;
  const match = REPO_DATA_REGEX.exec(commit);
  if (!match?.groups) return null;

  const { branch, date, name } = match.groups;
  const branchNode: ReactNode = webUrl ? (
    <a href={webUrl} target="_blank" rel="noreferrer">
      {branch}
    </a>
  ) : (
    branch
  );

  return [
    `${label} (`,
    branchNode,
    ") updated at ",
    date.slice(0, -3),
    " by ",
    name,
  ];
}

export function Dashboard() {
  const { token } = useAuthToken();

  const [initialized, setInitialized] = useState(false);
  const [commitInfo, setCommitInfo] = useState<Record<string, string>>({});
  const [deviceCount, setDeviceCount] = useState<Record<string, number>>({});
  const [systemVersion, setSystemVersion] = useState<SystemVersion>({});
  const [settingsInfo, setSettingsInfo] = useState<ReactNode>("Unknown");
  const [templatesInfo, setTemplatesInfo] = useState<ReactNode>("Unknown");

  const getRepoStatus = async (repoName: string) => {
    try {
      const data = await fetchRepoStatus(repoName, token);
      setCommitInfo((prev) => ({ ...prev, [repoName]: data }));
    } catch {
      setCommitInfo({});
    }
  };

  const getDeviceCount = async (name: string, filter: string) => {
    try {
      const count = await fetchDeviceCount(filter, token);
      setDeviceCount((prev) => ({ ...prev, [name]: count }));
    } catch {
      setDeviceCount({});
    }
  };

  const getSystemVersion = async () => {
    try {
      setSystemVersion(await fetchSystemVersion(token));
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
    setSettingsInfo(
      buildRepoInfo(
        "Settings",
        commitInfo.settings,
        process.env.SETTINGS_WEB_URL,
      ),
    );
    setTemplatesInfo(
      buildRepoInfo(
        "Templates",
        commitInfo.templates,
        process.env.TEMPLATES_WEB_URL,
      ),
    );
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
              <a href="/devices?filter[synchronized]=false&filter[state]=MANAGED">
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
        {process.env.NETBOX_API_URL && process.env.NETBOX_TENANT_ID && (
          <DashboardInterfaceStatus />
        )}
        {process.env.NETBOX_API_URL && process.env.NETBOX_TENANT_ID && (
          <DashboardNetboxTenant />
        )}
        <DashboardLinkgrid />
      </Container>
    </div>
  );
}
