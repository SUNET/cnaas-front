import { createBrowserRouter, RouterProvider } from "react-router";
import { flushSync } from "react-dom";
import AuthContextProvider from "./contexts/AuthContext";
import { Footer } from "./components/Footer";
import { Panel } from "./components/Panel";
import { Callback } from "./components/Callback";
import { ConfigChange } from "./components/ConfigChange/ConfigChange";
import Dashboard from "./components/Dashboard";
import { DeviceList } from "./components/DeviceList/DeviceList";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FirmwareCopy from "./components/FirmwareCopy";
import { FirmwareUpgrade } from "./components/FirmwareUpgrade";
import GroupList from "./components/GroupList";
import { InterfaceConfig } from "./components/InterfaceConfig/InterfaceConfig";
import { JobList } from "./components/JobList";
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
          { path: "/devices", element: <DeviceList /> },
          { path: "/jobs", element: <JobList /> },
          { path: "/groups", element: <GroupList /> },
          { path: "/config-change", element: <ConfigChange /> },
          { path: "/firmware-upgrade", element: <FirmwareUpgrade /> },
          { path: "/firmware-copy", element: <FirmwareCopy /> },
          { path: "/interface-config", element: <InterfaceConfig /> },
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
