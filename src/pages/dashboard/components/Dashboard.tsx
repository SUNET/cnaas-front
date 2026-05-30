import { useEffect, useState } from "react";
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

type RepoStatus = { branch: string; date: string; name: string };

function parseRepoStatus(commit: string | undefined): RepoStatus | null {
  if (!commit) return null;
  const match = REPO_DATA_REGEX.exec(commit);
  if (!match?.groups) return null;

  const { branch, date, name } = match.groups;
  return { branch, date: date.slice(0, -3), name };
}

type RepoInfoProps = {
  readonly label: string;
  readonly commit: string | undefined;
  readonly webUrl: string | undefined;
};

function RepoInfo({ label, commit, webUrl }: RepoInfoProps) {
  const status = parseRepoStatus(commit);
  if (!status) return <>Unknown</>;

  return (
    <>
      {`${label} (`}
      {webUrl ? (
        <a href={webUrl} target="_blank" rel="noreferrer">
          {status.branch}
        </a>
      ) : (
        status.branch
      )}
      {`) updated at ${status.date} by ${status.name}`}
    </>
  );
}

export function Dashboard() {
  const { token } = useAuthToken();

  const [commitInfo, setCommitInfo] = useState<Record<string, string>>({});
  const [deviceCount, setDeviceCount] = useState<Record<string, number>>({});
  const [systemVersion, setSystemVersion] = useState<SystemVersion>({});

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
    if (!token) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount effect; populating dashboard data is the point
    getRepoStatus("settings");
    getRepoStatus("templates");
    getDeviceCount("managed", "filter[state]=MANAGED");
    getDeviceCount(
      "unsynchronized",
      "filter[state]=MANAGED&filter[synchronized]=false",
    );
    getSystemVersion();
  }, [token]);

  return (
    <div>
      <Container>
        <Grid columns={2}>
          <Grid.Column width={8}>
            <p>
              <RepoInfo
                label="Settings"
                commit={commitInfo.settings}
                webUrl={process.env.SETTINGS_WEB_URL}
              />
            </p>
            <p>
              <RepoInfo
                label="Templates"
                commit={commitInfo.templates}
                webUrl={process.env.TEMPLATES_WEB_URL}
              />
            </p>
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
