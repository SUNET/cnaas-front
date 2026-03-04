import { NavLink } from "react-router";
import { useAuthToken } from "../../contexts/AuthTokenContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { JwtInfo } from "./JwtInfo";
import ReloginModal from "./ReloginModal";

export function Header() {
  const { loggedIn, tokenWillExpire } = useAuthToken();
  const { permissionsCheck } = usePermissions();

  const renderLinks = () => {
    if (!loggedIn) {
      return [
        <NavLink
          end
          className={({ isActive }) => (isActive ? "active" : undefined)}
          to="/"
          key="navlogin"
        >
          <li key="nav1">Login</li>
        </NavLink>,
      ];
    }

    return [
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Dashboard", "read")}
        to="/dashboard"
        key="nav1"
      >
        <li>Dashboard</li>
      </NavLink>,
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Devices", "read")}
        onClick={(e) => {
          if (location.pathname === "/devices") e.preventDefault();
        }}
        to="/devices"
        key="nav2"
      >
        <li>Devices</li>
      </NavLink>,
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Groups", "read")}
        to="/groups"
        key="nav3"
      >
        <li>Groups</li>
      </NavLink>,
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Jobs", "read")}
        to="/jobs"
        key="nav4"
      >
        <li>Jobs</li>
      </NavLink>,
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Firmware", "read")}
        to="/firmware-copy"
        key="nav5"
      >
        <li>Firmware</li>
      </NavLink>,
      <NavLink
        end
        className={({ isActive }) => (isActive ? "active" : undefined)}
        hidden={!permissionsCheck("Config change", "read")}
        to="/config-change"
        key="nav6"
      >
        <li>Config change</li>
      </NavLink>,
      <JwtInfo key="navjwtinfo" />,
    ];
  };

  return (
    <header>
      <nav>
        <h1>CNaaS NMS: {process.env.API_URL.split("/")[2]}</h1>
        <ul>{renderLinks()}</ul>
        <ReloginModal isOpen={tokenWillExpire} />
      </nav>
    </header>
  );
}
