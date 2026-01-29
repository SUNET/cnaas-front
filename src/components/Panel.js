import { Route } from "react-router-dom";
import Callback from "./Callback";
import ConfigChange from "./ConfigChange/ConfigChange";
import Dashboard from "./Dashboard";
import DeviceList from "./DeviceList/DeviceList";
import ErrorBoundary from "./ErrorBoundary";
import FirmwareCopy from "./FirmwareCopy";
import { FirmwareUpgrade } from "./FirmwareUpgrade";
import GroupList from "./GroupList";
import { InterfaceConfig } from "./InterfaceConfig/InterfaceConfig";
import JobList from "./JobList";
import Login from "./Login/Login";
import Settings from "./Settings";

function Panel() {
  return (
    <div id="panel">
      <Route exact path="/" render={() => <Login />} />
      <Route exact path="/callback" component={Callback} />
      <ErrorBoundary>
        <Route exact path="/dashboard" component={Dashboard} />
        <Route exact path="/devices" component={DeviceList} />
        <Route exact path="/jobs" component={JobList} />
        <Route exact path="/groups" component={GroupList} />
        <Route exact path="/config-change" component={ConfigChange} />
        <Route exact path="/firmware-upgrade" component={FirmwareUpgrade} />
        <Route exact path="/firmware-copy" component={FirmwareCopy} />
        <Route exact path="/interface-config" component={InterfaceConfig} />
        <Route exact path="/settings" component={Settings} />
      </ErrorBoundary>
    </div>
  );
}

export default Panel;
