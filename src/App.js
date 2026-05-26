import { createBrowserRouter, RouterProvider } from "react-router";
import { flushSync } from "react-dom";
import AuthContextProvider from "./contexts/AuthContext";
import { Footer } from "./components/Footer";
import { Panel } from "./components/Panel";
import { Callback } from "./components/Callback";
import { ConfigChangePage } from "./components/ConfigChange/components/ConfigChangePage";
import Dashboard from "./components/Dashboard";
import { DeviceListPage } from "./components/DeviceList/DeviceListPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FirmwareCopy from "./components/FirmwareCopy";
import { FirmwareUpgrade } from "./components/FirmwareUpgrade";
import GroupList from "./components/GroupList";
import { InterfaceConfigPage } from "./components/InterfaceConfig/components/InterfaceConfigPage";
import { JobListPage } from "./components/JobList";
import Login from "./components/Login/Login";
import Settings from "./components/Settings";

const router = createBrowserRouter([
  {
    element: <Panel />,
    children: [
      { path: "/", element: <Login /> },
      { path: "/callback", element: <Callback /> },
      {
        element: <ErrorBoundary />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/devices", element: <DeviceListPage /> },
          { path: "/jobs", element: <JobListPage /> },
          { path: "/groups", element: <GroupList /> },
          { path: "/config-change", element: <ConfigChangePage /> },
          { path: "/firmware-upgrade", element: <FirmwareUpgrade /> },
          { path: "/firmware-copy", element: <FirmwareCopy /> },
          { path: "/interface-config", element: <InterfaceConfigPage /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <div className="container">
      <AuthContextProvider>
        <RouterProvider router={router} flushSync={flushSync} />
      </AuthContextProvider>
      <Footer />
    </div>
  );
}
