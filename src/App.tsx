import { createBrowserRouter, RouterProvider } from "react-router";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AuthContextProvider from "./stores/AuthContext";
import { Toaster } from "./components/toast";
import { Footer } from "./components/Footer";
import { Panel } from "./components/Panel";
import { Callback } from "./components/Callback";
import { ConfigChangePage } from "./pages/config-change";
import { Dashboard } from "./pages/dashboard";
import { DeviceListPage } from "./pages/devices";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FirmwareCopy } from "./pages/firmware-copy";
import { FirmwareUpgradePage } from "./pages/firmware-upgrade";
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
          { path: "/firmware-upgrade", element: <FirmwareUpgradePage /> },
          { path: "/firmware-copy", element: <FirmwareCopy /> },
          { path: "/interface-config", element: <InterfaceConfigPage /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);

const theme = createTheme({
  typography: {
    fontFamily: '"Karla", sans-serif',
  },
});

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="container">
        <AuthContextProvider>
          <RouterProvider router={router} />
        </AuthContextProvider>
        <Footer />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
