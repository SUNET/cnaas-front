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

    getDeviceList() {
        if (this.props.target.hostname !== undefined) {
            const credentials = localStorage.getItem("token");
            let url = process.env.API_URL + "/api/v1.0/devices?filter[hostname]="+this.props.target.hostname+"&filter[state]=MANAGED&per_page=1000";
            getData(url, credentials).then(data => {
                this.setState({devices: data['data']['devices']});
            });
        } else if (this.props.target.group !== undefined) {

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
        return <Table key="devicelist" celled collapsing>
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
        </Table>;
    }

    render() {
        let ret = [];
        if (this.props.target.all !== undefined) {
            ret.push(<p key="syncstatus">SyncStatus: All</p>);
        } else if (this.props.target.hostname !== undefined) {
            ret.push(<p key="syncstatus">SyncStatus: {this.props.target.hostname}</p>);
        } else if (this.props.target.group !== undefined) {
            ret.push(<p key="syncstatus">SyncStatus: {this.props.target.group}</p>);
        }
        ret.push(this.renderDeviceList());
        return ret;
    }
}

SyncStatus.propTypes = {
    target: PropTypes.object.isRequired,
}

export default SyncStatus;