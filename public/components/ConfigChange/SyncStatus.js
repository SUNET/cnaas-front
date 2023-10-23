import _ from 'lodash';
import React from "react";
import PropTypes from 'prop-types'
import { Popup, Table, Icon } from "semantic-ui-react";
import formatISODate from "../../utils/formatters";

import getData from "../../utils/getData";

class SyncStatus extends React.Component {
  state = {
    devices: [],
    synchistory: {},
    expanded: false
  }

  toggleExpand = (e, props) => {
    this.setState({expanded: !this.state.expanded});
  }

  getCommitTargetName(target) {
    if (target.all !== undefined) {
    return "All unsynchronized devices";
    } else if (target.hostname !== undefined) {
    return "Hostname: " + target.hostname
    } else if (target.group !== undefined) {
    return "Group: " + target.group
    } else {
    return "Unknown"
    }
  };

  getDeviceList() {
    if (this.props.target.hostname !== undefined) {
      const credentials = localStorage.getItem("token");
      let url = process.env.API_URL + "/api/v1.0/devices?filter[hostname]="+this.props.target.hostname+"&filter[state]=MANAGED&per_page=1";
      getData(url, credentials).then(data => {
        this.setState({devices: data['data']['devices']});
      });
    } else if (this.props.target.group !== undefined) {
      const credentials = localStorage.getItem("token");
      let url_devices = process.env.API_URL + "/api/v1.0/devices?filter[synchronized]=false&filter[state]=MANAGED&per_page=1000";
      getData(url_devices, credentials).then(data_devices => {
        let url_group = process.env.API_URL + "/api/v1.0/groups/"+this.props.target.group;
        getData(url_group, credentials).then(data_group => {
          this.setState({devices: _.filter(data_devices['data']['devices'], (dev) => (data_group['data']['groups'][this.props.target.group].includes(dev.hostname)))});
        });
      });
    } else {
      const credentials = localStorage.getItem("token");
      let url = process.env.API_URL + "/api/v1.0/devices?filter[synchronized]=false&filter[state]=MANAGED&per_page=1000";
      getData(url, credentials).then(data => {
        this.setState({devices: data['data']['devices']});
      });
    }
  }

  getSyncHistory() {
    const credentials = localStorage.getItem("token");
    let url = process.env.API_URL + "/api/v1.0/device_synchistory";
    getData(url, credentials).then(data => {
      this.setState({synchistory: data['data']['hostnames']});
    });
  }

  componentDidMount() {
    this.getDeviceList();
    this.getSyncHistory();
  }

  renderDeviceList() {
    let causeTypes = new Set();  // what unique "cause" types can the events have
    let byCause = {}; // events sorted by "cause" as key

    this.state.devices.forEach(device => {
      if (device.hostname in this.state.synchistory) {
        let deviceCauses = new Set(); // Unique causes this device has been impacted by
        let eventList = this.state.synchistory[device.hostname].map((e, index) => {
          if (!causeTypes.has(e.cause)) {
            byCause[e.cause] = [];
            causeTypes.add(e.cause);
          }
          let timestamp = new Date();
          timestamp.setTime(e.timestamp*1000);
          deviceCauses.add(e.cause);
          return <li key={index}>{e.cause} by {e.by} at {formatISODate(timestamp.toISOString())}</li>;
        } );
        
        let deviceEntry = <li key={device.hostname}><Popup flowing hoverable content={<ul>{eventList}</ul>} trigger={<a>{device.hostname} ({eventList.length})</a>} /></li>
        
        deviceCauses.forEach((cause) => {
          byCause[cause].push(deviceEntry);
        });
      }
    });
    let headers = [];
    let contents = [];
    Object.entries(byCause).map(([cause, devices]) => {
      headers.push(cause);
      contents.push(devices);
    });
    if (contents.length >= 1) {
      return <div key="tablecontainer" className='tablecontainer'>
        <Table key="synceventlist" celled collapsing>
          <Table.Header>
            <Table.Row>
              {headers.map((cause) => {return <Table.HeaderCell key={cause}>{cause}</Table.HeaderCell>})} 
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              {contents.map((devices, index) => {return <Table.Cell key={"devices_"+index}><ul>{devices}</ul></Table.Cell>})}
            </Table.Row>
          </Table.Body>
        </Table>
      </div>;
    } else {
      return <p key="no_events">No known synchronization events (old events are not persistent across server reboots)</p>
    }
  }

  render() {
    let ret = [];
    let commitTargetName = this.getCommitTargetName(this.props.target);
    ret.push(this.renderDeviceList());
    return [<h1 key="header">Commit configuration changes (syncto)</h1>,
      <div key="container" className="task-container">
      <div key="heading" className="heading">
        <h2 id="dry_run_section">
        <Icon name='dropdown' onClick={this.toggleExpand} rotated={this.state.expanded?null:"counterclockwise"} />
        Target: { commitTargetName }
        <Popup
          content="Specifies the target devices for the dry run and confirm commit actions below. Synchronization events are previous events that has caused the target devices to have become unsynchronized."
          trigger={<Icon name="question circle outline" size="small" />}
          wide
          />
        </h2>
      </div>
      <div key="events" className="task-collapsable" hidden={!this.state.expanded}>
        <p key="syncstatus">Synchronization events for: { commitTargetName }</p>
        {ret}
      </div>
      </div>];
  }
}

SyncStatus.propTypes = {
  target: PropTypes.object.isRequired,
}

export default SyncStatus;