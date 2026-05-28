import { createBrowserRouter, RouterProvider } from "react-router";
import { flushSync } from "react-dom";
import AuthContextProvider from "./contexts/AuthContext";
import { Footer } from "./components/Footer";
import { Panel } from "./components/Panel";
import { Callback } from "./components/Callback";
import { ConfigChangePage } from "./pages/config-change";
import { Dashboard } from "./pages/dashboard";
import { DeviceListPage } from "./pages/devices";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FirmwareCopy } from "./pages/firmware-copy";
import { FirmwareUpgrade } from "./pages/firmware-upgrade";
import { GroupList } from "./pages/groups";
import { InterfaceConfigPage } from "./pages/interface-config";
import { JobListPage } from "./pages/jobs";
import Login from "./components/Login/Login";
import { Settings } from "./pages/settings";

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
