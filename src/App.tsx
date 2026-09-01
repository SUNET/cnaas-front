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

// Palette mirrors the design tokens in src/styles/variables.css. MUI's color
// math (alpha/lighten/darken) can't parse var(), so the hex values are
// duplicated here instead of referencing the custom properties. Keep them in
// sync with variables.css.
const theme = createTheme({
  palette: {
    primary: { main: "#003049" }, // --color-primary
    secondary: { main: "#ff4500" }, // --color-secondary
    error: { main: "#ff0000" }, // --color-error
    warning: { main: "#ed6c02" }, // --color-warning
    success: { main: "#2e7d32" }, // --color-success
    background: { default: "#ffffff" }, // --color-background
  },
  typography: {
    fontFamily: '"Karla", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // The app's buttons are not uppercased.
          textTransform: "none",
          // Slightly larger, more comfortable default sizing.
          fontSize: "var(--size-md)",
          padding: "var(--size-xs) var(--size-md)",
          // Buttons almost always want breathing room around them; bake in a
          // small margin so callers don't need per-container gap/margin hacks.
          // Buttons inside a ButtonGroup are excluded (the group joins them and
          // manages its own spacing/borders).
          "&:not(.MuiButtonGroup-grouped)": {
            margin: "var(--size-xxs)",
          },
        },
      },
    },
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
