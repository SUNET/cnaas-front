import React from "react";
import PropTypes from 'prop-types'
import { Popup, Table } from "semantic-ui-react";
import formatISODate from "../../utils/formatters";

import getData from "../../utils/getData";

class SyncStatus extends React.Component {
    state = {
        devices: [],
        synchistory: {}
    }

    getDeviceList(hostname, group) {
        if (hostname !== undefined) {

        } else if (group !== undefined) {

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
                let eventList = this.state.synchistory[device.hostname].map((e) => {
                    if (!causeTypes.has(e.cause)) {
                        byCause[e.cause] = [];
                        causeTypes.add(e.cause);
                    }
                    let timestamp = new Date();
                    timestamp.setTime(e.timestamp*1000);
                    deviceCauses.add(e.cause);
                    return <li>{e.cause} by {e.by} at {formatISODate(timestamp.toISOString())}</li>;
                } );
                
                let deviceEntry = <li key={device.hostname}><Popup flowing hoverable content={<ul>{eventList}</ul>} trigger={<a>{device.hostname}</a>} /></li>
                
                deviceCauses.forEach((cause) => {
                    byCause[cause].push(deviceEntry);
                });
            }
        });
        let headers = [];
        let contents = [];
        let ret = Object.entries(byCause).map(([cause, devices]) => {
            return <li>{cause}: <ul>{devices.reduce((prev, curr) => [prev, ', ', curr])}</ul></li>;

        });
        return <ul>{ret}</ul>;
    }

    render() {
        let ret = [];
        if (this.props.target.all !== undefined) {
            ret.push(<p>SyncStatus: All</p>);
        } else if (this.props.target.hostname !== undefined) {
            ret.push(<p>SyncStatus: {this.props.target.hostname}</p>);
        } else if (this.props.target.group !== undefined) {
            ret.push(<p>SyncStatus: {this.props.target.group}</p>);
        }
        ret.push(this.renderDeviceList());
        return ret;
    }
}

SyncStatus.propTypes = {
    target: PropTypes.object.isRequired,
}

export default SyncStatus;