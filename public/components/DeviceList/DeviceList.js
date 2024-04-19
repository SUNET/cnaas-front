import React from 'react'
import {
  Dropdown,
  Icon,
  Pagination,
  Popup,
  Button,
  Select,
  Checkbox,
  Modal,
  Input
} from 'semantic-ui-react'
import DeviceSearchForm from './DeviceSearchForm'
import checkResponseStatus from '../../utils/checkResponseStatus'
import DeviceInitForm from './DeviceInitForm'
import queryString from 'query-string'
import { getData, getResponse } from '../../utils/getData'
import { deleteData } from '../../utils/sendData'
import { SemanticToastContainer, toast } from 'react-semantic-toasts-2'
import DeviceInfoBlock from "./DeviceInfoBlock"

const io = require('socket.io-client')
let socket = null

class DeviceList extends React.Component {
  state = {
    sortField: 'id',
    filterField: null,
    filterValue: null,
    hostname_sort: '',
    device_type_sort: '',
    state_sort: '',
    id_sort: '↓',
    devicesData: [],
    deviceInterfaceData: {},
    activePage: 1,
    totalPages: 1,
    resultsPerPage: 20,
    deviceJobs: {},
    logLines: [],
    queryParamsParsed: false,
    queryString: '',
    loading: true,
    error: null,
    displayColumns: [],
    delete_modal_open: false,
    delete_modal_device_id: null,
    delete_modal_device_state: null,
    delete_modal_device_type: null,
    delete_modal_confirm_name: '',
    delete_modal_factory_default: false,
    delete_modal_error: null
  }

  discovered_device_ids = new Set()

  populateDiscoveredDevices () {
    const credentials = localStorage.getItem('token')
    let url =
      process.env.API_URL +
      '/api/v1.0/devices?filter[state]=DISCOVERED&per_page=100'
    getData(url, credentials).then(data => {
      data.data.devices.forEach(dev => {
        this.discovered_device_ids.add(dev.id)
      })
    }).catch(error => {
      console.log(error)
      this.setState({
        devicesData: [],
        loading: false,
        error: error
      })
    })
  }

  parseQueryParams (callback) {
    if (this.state.queryParamsParsed === false) {
      let queryParams = queryString.parse(this.props.location.search)
      this.setState({
        queryParamsParsed: true,
        queryString: this.props.location.search
      })
      let filterRegex = /filter\[(?<field>\w+)\]/
      let found = false
      Object.entries(queryParams).forEach(([field, value]) => {
        let match = filterRegex.exec(field)
        if (match) {
          found = true
          this.setState(
            {
              filterField: match.groups.field,
              filterValue: value
            },
            () => {
              callback()
            }
          )
        }
      })
      if (!found) {
        callback({ filterField: null, filterValue: null })
      }
    }
  }

  addDeviceJob = (device_id, job_id) => {
    let deviceJobs = this.state.deviceJobs
    if (device_id in deviceJobs) {
      deviceJobs[device_id].push(job_id)
    } else {
      deviceJobs[device_id] = [job_id]
    }
    this.setState({ deviceJobs: deviceJobs }, () => {
      console.log('device jobs: ', this.state.deviceJobs)
    })
  }

  findAction = (event, options, toast) => {
    if (toast) {
      // close toast
      event.target.parentElement.parentElement.parentElement.parentElement.remove()
    }
    this.props.history.push()
    this.setState({ activePage: 1, queryParamsParsed: false }, () => {
      this.getDevicesData(options).then(() => {
        window.scrollTo(0, 0)
        // Expand results when looking up device
        const deviceDetails =
          document.getElementsByClassName('device_details_row')
          for (let deviceDetail of deviceDetails) {
          deviceDetail.hidden = false
          this.getInterfacesData(deviceDetail.previousElementSibling.id)
        }
      })
    })
  }

  searchAction = options => {
    this.setState({ activePage: 1, queryParamsParsed: false }, () => {
      this.getDevicesData(options)
      window.scrollTo(0, 0)
      // Close all expanded table rows when changing results
      const deviceDetails = document.getElementsByClassName('device_details_row')
      for (let deviceDetail of deviceDetails) {
        deviceDetail.hidden = true
      }
    })
  }

  getDevicesData = options => {
    if (options === undefined) options = {}
    let newState = this.state
    if (options.sortField !== undefined) {
      newState['sortField'] = options.sortField
    }
    if (
      options.filterField !== undefined &&
      options.filterValue !== undefined
    ) {
      newState['filterField'] = options.filterField
      newState['filterValue'] = options.filterValue

      if (options.filterField === null || options.filterValue === null) {
        this.props.history.replace('devices')
        newState['queryString'] = ''
      } else {
        this.props.history.replace(
          'devices?filter[' + options.filterField + ']=' + options.filterValue
        )
      }
    }
    if (options.pageNum !== undefined) {
      newState['activePage'] = options.pageNum
    }
    this.setState(newState)
    return this.getDevicesAPIData(
      newState['sortField'],
      newState['filterField'],
      newState['filterValue'],
      newState['activePage']
    )
  }

  /**
   * Handle sorting on different columns when clicking the header fields
   */
  sortHeader = header => {
    let newState = this.state
    let sortField = 'id'
    const oldValue = this.state[header + '_sort']
    newState['hostname_sort'] = ''
    newState['device_type_sort'] = ''
    newState['state_sort'] = ''
    newState['id_sort'] = ''
    if (oldValue == '' || oldValue == '↑') {
      newState[header + '_sort'] = '↓'
      sortField = header
    } else if (oldValue == '↓') {
      newState[header + '_sort'] = '↑'
      sortField = '-' + header
    }
    this.setState(newState)
    this.getDevicesData({ sortField: sortField })
    // Close all expanded table rows when resorting the table
    const deviceDetails = document.getElementsByClassName('device_details_row')
    for (let deviceDetail of deviceDetails) {
      deviceDetail.hidden = true
    }
  }

  componentDidUpdate () {
    // if queryparams are updated, for example when browser uses Back button to same baseurl but different query params
    if (this.state.queryString != this.props.location.search) {
      this.setState({ queryParamsParsed: false }, () => {
        this.parseQueryParams(this.getDevicesData)
      })
    }
  }

  componentDidMount () {
    const credentials = localStorage.getItem('token')
    if (credentials === null) {
      throw 'no API token found'
    }
    if (this.state.queryParamsParsed === false) {
      this.parseQueryParams(this.getDevicesData)
    } else {
      this.getDevicesData()
    }
    this.populateDiscoveredDevices()
    socket = io(process.env.API_URL, { query: { jwt: credentials } })
    socket.on('connect', function (data) {
      console.log('Websocket connected!')
      var ret = socket.emit('events', { update: 'device' })
      var ret = socket.emit('events', { update: 'job' })
      var ret = socket.emit('events', { loglevel: 'DEBUG' })
    })
    socket.on('events', data => {
      // device update event
      if (data.device_id !== undefined) {
        if (data.action == 'UPDATED') {
          if (data.object.state == 'DISCOVERED') {
            if (
              data.device_id !== undefined &&
              data.device_id !== null &&
              !this.discovered_device_ids.has(data.device_id)
            ) {
              toast({
                type: 'info',
                icon: 'paper plane',
                title: 'Device discovered: ' + data.hostname,
                description: (
                  <p>
                    Model: {data.object.model}, Serial: {data.object.serial}
                    <br />
                    <Button
                      basic
                      compact
                      onClick={e =>
                        this.findAction(
                          e,
                          { filterField: 'id', filterValue: data.device_id },
                          true
                        )
                      }
                    >
                      Go to device
                    </Button>
                  </p>
                ),
                animation: 'bounce',
                time: 0
              })
              this.discovered_device_ids.add(data.device_id)
            }
          }
          let newDevicesData = this.state.devicesData.map(dev => {
            if (dev.id == data.device_id) {
              return data.object
            } else {
              return dev
            }
          })
          this.setState({ devicesData: newDevicesData })
        } else if (data.action == 'DELETED') {
          let newDevicesData = this.state.devicesData.map(dev => {
            if (dev.id == data.device_id) {
              let new_dev = dev
              new_dev['deleted'] = true
              return new_dev
            } else {
              return dev
            }
          })
          this.setState({ devicesData: newDevicesData })
        } else if (data.action == 'CREATED') {
          if (data.device_id !== undefined && data.device_id !== null) {
            toast({
              type: 'info',
              icon: 'paper plane',
              title: 'Device added: ' + data.hostname,
              description: (
                <p>
                  State: {data.object.state}
                  <br />
                  <Button
                    basic
                    compact
                    onClick={e =>
                      this.findAction(
                        e,
                        { filterField: 'id', filterValue: data.device_id },
                        true
                      )
                    }
                  >
                    Go to device
                  </Button>
                </p>
              ),
              animation: 'bounce',
              time: 0
            })
          }
        }
        // job update event
      } else if (data.job_id !== undefined) {
        const newLogLines = this.state.logLines
        if (data.status === 'EXCEPTION') {
          newLogLines.push(
            'job #' +
              data.job_id +
              ' changed status to ' +
              data.status +
              ': ' +
              data.exception +
              '\n'
          )
        } else {
          newLogLines.push(
            'job #' + data.job_id + ' changed status to ' + data.status + '\n'
          )
        }
        this.setState({ logLines: newLogLines })

        // if finished && next_job id, push next_job_id to array
        if (
          data.next_job_id !== undefined &&
          typeof data.next_job_id === 'number'
        ) {
          let newDeviceInitJobs = {}
          Object.keys(this.state.deviceJobs).map(device_id => {
            if (this.state.deviceJobs[device_id][0] == data.job_id) {
              newDeviceInitJobs[device_id] = [data.job_id, data.next_job_id]
            } else {
              newDeviceInitJobs[device_id] = this.state.deviceJobs[device_id]
            }
          })
          this.setState({ deviceJobs: newDeviceInitJobs }, () => {
            console.log('next_job_updated list: ', this.state.deviceJobs)
          })
        }
        // log events
      } else if (typeof data === 'string' || data instanceof String) {
        const newLogLines = this.state.logLines
        if (newLogLines.length >= 1000) {
          newLogLines.shift()
        }
        newLogLines.push(data + '\n')
        this.setState({ logLines: newLogLines })
      }
    })
  }

  componentWillUnmount () {
    if (socket !== null) {
      socket.off('events')
    }
  }

  readHeaders = response => {
    const totalCountHeader = response.headers.get('X-Total-Count')
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log('total: ' + totalCountHeader)
      const totalPages = Math.ceil(totalCountHeader / this.state.resultsPerPage)
      this.setState({ totalPages: totalPages })
    } else {
      console.log('Could not find X-Total-Count header, only showing one page')
    }
    return response
  }

  getDevicesAPIData = (sortField = 'id', filterField, filterValue, pageNum) => {
    this.setState({ loading: true, error: null })
    const credentials = localStorage.getItem('token')
    // Build filter part of the URL to only return specific devices from the API
    // TODO: filterValue should probably be urlencoded?
    let filterParams = ''
    let filterFieldOperator = ''
    const stringFields = [
      'hostname',
      'management_ip',
      'serial',
      'ztp_mac',
      'platform',
      'vendor',
      'model',
      'os_version'
    ]
    const false_strings = ['false', 'no', '0']
    if (
      filterField !== null &&
      filterValue !== null &&
      filterField !== 'null' &&
      filterValue !== 'null'
    ) {
      if (stringFields.indexOf(filterField) !== -1) {
        filterFieldOperator = '[contains]'
      }
      if (filterField == 'synchronized') {
        if (false_strings.indexOf(filterValue) !== -1) {
          filterParams = '&filter[synchronized]=false&filter[state]=MANAGED'
        } else {
          filterParams = '&filter[synchronized]=true&filter[state]=MANAGED'
        }
      } else {
        filterParams =
          '&filter[' +
          filterField +
          ']' +
          filterFieldOperator +
          '=' +
          filterValue
      }
    }
    return getResponse(
      process.env.API_URL +
        '/api/v1.0/devices?sort=' +
        sortField +
        filterParams +
        '&page=' +
        pageNum +
        '&per_page=' +
        this.state.resultsPerPage,
      credentials
    )
      .then(response => this.readHeaders(response))
      .then(response => response.json())
      .then(data => {
        console.log('this should be data', data)
        {
          this.setState(
            {
              devicesData: data.data.devices,
              loading: false
            },
            () => {
              console.log('this is new state', this.state.devicesData)
            }
          )
        }
      })
      .catch(error => {
        this.setState({
          devicesData: [],
          loading: false,
          error: error
        })
      })
  }

  getInterfacesData (hostname) {
    const credentials = localStorage.getItem("token");
    getData(
      process.env.API_URL + '/api/v1.0/device/' + hostname + '/interfaces',
      credentials
    )
      .then(data => {
        console.log('this should be interface data', data)
        {
          let newDeviceInterfaceData = this.state.deviceInterfaceData
          if (
            Array.isArray(data.data.interfaces) &&
            data.data.interfaces.length
          ) {
            newDeviceInterfaceData[hostname] = data.data.interfaces
            this.setState({
              deviceInterfaceData: newDeviceInterfaceData
            })
          }
        }
      })
      .catch(error => {
        this.setState({
          loading: false,
          error: error
        })
      })
  }

  clickRow(closestTrParentId) {
    if (closestTrParentId in this.state.deviceInterfaceData === false) {
      this.getInterfacesData(closestTrParentId);
    }
  }

  pageChange (e, data) {
    // Update active page and then reload data
    this.setState({ activePage: data.activePage }, () => {
      this.getDevicesData({ numPage: data.activePage })
      window.scrollTo(0, 0)
      // Close all expanded table rows when changing page
      const deviceDetails = document.getElementsByClassName('device_details_row')
      for (let deviceDetail of deviceDetails) {
        deviceDetail.hidden = true
      }
    })
  }

  checkJobId (job_id) {
    return function (logLine) {
      return logLine.toLowerCase().includes('job #' + job_id)
    }
  }

  renderMlagLink (interfaceData) {
    return interfaceData
      .filter(intf => intf.configtype === 'MLAG_PEER')
      .map(intf => {
        return (
          <Button
            compact
            icon='exchange'
            key={intf.name}
            onClick={e =>
              this.findAction(
                e,
                { filterField: 'id', filterValue: intf.data.neighbor_id },
                false
              )
            }
            title='Go to MLAG peer device'
            content={intf.name + ': MLAG peer'}
          />
        )
      })
  }

  renderUplinkLink (interfaceData) {
    return interfaceData
      .filter(intf => intf.configtype === 'ACCESS_UPLINK')
      .map(intf => {
        return (
          <Button
            compact
            icon='arrow up'
            key={intf.name}
            onClick={e =>
              this.findAction(
                e,
                { filterField: 'hostname', filterValue: intf.data.neighbor },
                false
              )
            }
            title='Go to uplink device'
            content={intf.name + ': Uplink to ' + intf.data.neighbor}
          />
        )
      })
  }

  renderSortButton (key) {
    if (key === '↑') {
      return <Icon name='sort up' />
    } else if (key === '↓') {
      return <Icon name='sort down' />
    } else {
      return <Icon name='sort' />
    }
  }

  syncDeviceAction (hostname) {
    this.props.history.push('config-change?hostname=' + hostname)
  }

  upgradeDeviceAction (hostname) {
    this.props.history.push('firmware-upgrade?hostname=' + hostname)
  }

  configurePortsAction (hostname) {
    this.props.history.push('interface-config?hostname=' + hostname)
  }

  updateFactsAction (hostname, device_id) {
    console.log('Update facts for hostname: ' + hostname)
    const credentials = localStorage.getItem('token')

    let url = process.env.API_URL + '/api/v1.0/device_update_facts'
    let job_id = null
    let dataToSend = {
      hostname: hostname
    }

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
      .then(response => checkResponseStatus(response))
      .then(response => response.json())
      .then(data => {
        if (data.job_id !== undefined && typeof data.job_id === 'number') {
          this.addDeviceJob(device_id, data.job_id)
        } else {
          console.log(
            'error when submitting device_update_facts job',
            data.job_id
          )
        }
      })
  }

  updateDeleteModalConfirmName (e) {
    const val = e.target.value
    this.setState({
      delete_modal_confirm_name: val
    })
  }

  deleteDeviceFactoryDefaultAction = (event, data) => {
    this.setState({ delete_modal_factory_default: data.checked }, () => {
      console.log('factory_default: ' + this.state.delete_modal_factory_default)
    })
  }

  deleteModalOpen (device_id, device_hostname, device_state, device_type) {
    let factory_default = false
    if (device_state == 'MANAGED' && device_type == 'ACCESS') {
      factory_default = true
    }
    this.setState({
      delete_modal_open: true,
      delete_modal_device_id: device_id,
      delete_modal_device_hostname: device_hostname,
      delete_modal_device_state: device_state,
      delete_modal_device_type: device_type,
      delete_modal_confirm_name: '',
      delete_modal_factory_default: factory_default
    })
  }

  deleteModalClose () {
    this.setState({
      delete_modal_open: false,
      delete_modal_device_id: null,
      delete_modal_device_hostname: null,
      delete_modal_device_state: null,
      delete_modal_device_type: null,
      delete_modal_confirm_name: '',
      delete_modal_factory_default: false,
      delete_modal_error: null
    })
  }

  deleteDeviceAction () {
    let device_id = this.state.delete_modal_device_id
    let factory_default = this.state.delete_modal_factory_default

    const credentials = localStorage.getItem('token')

    let url = process.env.API_URL + '/api/v1.0/device/' + device_id
    let dataToSend = {
      factory_default: factory_default
    }

    deleteData(url, credentials, dataToSend)
      .then(data => {
        if (data.job_id !== undefined && typeof data.job_id === 'number') {
          this.addDeviceJob(device_id, data.job_id)
          this.deleteModalClose()
        } else {
          this.deleteModalClose()
        }
      })
      .catch(error => {
        console.log(error)
        if (typeof error.json === 'function') {
          error
            .json()
            .then(jsonError => {
              console.log(jsonError)
              this.setState({
                delete_modal_error: 'JSON error from API: ' + jsonError.message
              })
            })
            .catch(genericError => {
              console.log(error.statusText)
              this.setState({
                delete_modal_error: 'Error from API: ' + error.statusText
              })
            })
        } else {
          console.log(error)
          this.setState({ delete_modal_error: 'Fetch error: ' + error })
        }
      })
  }

  changeStateAction (device_id, state) {
    console.log('Change state for device_id: ' + device_id)
    const credentials = localStorage.getItem('token')

    let url = process.env.API_URL + '/api/v1.0/device/' + device_id
    let dataToSend = {
      state: state,
      synchronized: false
    }

    fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials}`
      },
      body: JSON.stringify(dataToSend)
    })
      .then(response => checkResponseStatus(response))
      .then(response => response.json())
      .then(data => {
        if (data.status !== 'success') {
          console.log('error when updating state:', data.error)
        }
      })
  }

  updatePerPageOption (e, option) {
    const val = option.value
    this.setState(
      {
        resultsPerPage: val
      },
      () => this.getDevicesData()
    )
  }

  columnSelectorChange = (e, data) => {
    let newDisplayColumns = this.state.displayColumns
    if (data.checked === true && newDisplayColumns.indexOf(data.name) === -1) {
      newDisplayColumns.push(data.name)
    } else if (data.checked === false) {
      const index = newDisplayColumns.indexOf(data.name)
      if (index > -1) {
        newDisplayColumns.splice(index, 1)
      }
    }
    this.setState({ displayColumns: newDisplayColumns })
  }

  createMgmtIP(mgmt_ip, key_prefix="") {
    const mgmtip = [];
    mgmtip.push(<i key={`${key_prefix}mgmt_ip`}>{mgmt_ip} </i>);
    mgmtip.push(
      <Button key={`${key_prefix}copy`} basic compact size="mini" icon="copy" title={mgmt_ip}
        onClick={() => {navigator.clipboard.writeText(mgmt_ip)}} />
    );
    const isIPv6 = mgmt_ip.includes(":");
    const ssh_address = isIPv6
      ? 'ssh://[' + mgmt_ip + ']'
      : 'ssh://' + mgmt_ip;
    mgmtip.push(
      <Button key={`${key_prefix}ssh`} basic compact size="mini" icon="terminal" title={ssh_address}
      onClick={() => {window.location = ssh_address}} />
    );

    return mgmtip;
  }

  createMenuActionsForDevice(device) {
    let menuActions = [
      <Dropdown.Item
        key='noaction'
        text='No actions allowed in this state'
        disabled={true} />
    ]
    if (device.state == 'DHCP_BOOT') {
      menuActions = [
        <Dropdown.Item
          key='delete'
          text='Delete device...'
          onClick={() => this.deleteModalOpen(
            device.id,
            device.hostname,
            device.state,
            device.device_type
          )} />
      ]
    } else if (device.state == 'DISCOVERED') {
      menuActions = [
        <Dropdown.Item
          key='delete'
          text='Delete device...'
          onClick={() => this.deleteModalOpen(
            device.id,
            device.hostname,
            device.state,
            device.device_type
          )} />
      ]
    } else if (device.state == 'MANAGED') {
      menuActions = [
        <Dropdown.Item
          key='sync'
          text='Sync device...'
          onClick={() => this.syncDeviceAction(device.hostname)} />,
        <Dropdown.Item
          key='fwupgrade'
          text='Firmware upgrade...'
          onClick={() => this.upgradeDeviceAction(device.hostname)} />,
        <Dropdown.Item
          key='facts'
          text='Update facts'
          onClick={() => this.updateFactsAction(device.hostname, device.id)} />,
        <Dropdown.Item
          key='makeunmanaged'
          text='Make unmanaged'
          onClick={() => this.changeStateAction(device.id, 'UNMANAGED')} />,
        <Dropdown.Item
          key='delete'
          text='Delete device...'
          onClick={() => this.deleteModalOpen(
            device.id,
            device.hostname,
            device.state,
            device.device_type
          )} />
      ]
      if (device.device_type === 'ACCESS') {
        menuActions.push(
          <Dropdown.Item
            key='configports'
            text='Configure ports'
            onClick={() => this.configurePortsAction(device.hostname)} />
        )
      }
    } else if (device.state == 'UNMANAGED') {
      menuActions = [
        <Dropdown.Item
          key='facts'
          text='Update facts'
          onClick={() => this.updateFactsAction(device.hostname, device.id)} />,
        <Dropdown.Item
          key='makemanaged'
          text='Make managed'
          onClick={() => this.changeStateAction(device.id, 'MANAGED')} />,
        <Dropdown.Item
          key='delete'
          text='Delete device...'
          onClick={() => this.deleteModalOpen(
            device.id,
            device.hostname,
            device.state,
            device.device_type
          )} />
      ]
    }

    if (device?.deleted === true) {
      menuActions = [
        <Dropdown.Item
          key='noaction'
          text='No actions allowed for deleted device'
          disabled={true} />
      ]
    }

    return menuActions;
  }

  createHostnameExtraForDevice(device) {
    if (device?.deleted) {
      return [<Icon key='deleted' name='delete' color='red' />]
    }

    const hostnameExtra = []
    if (device.state == "MANAGED" && device.device_type === "ACCESS") {
      hostnameExtra.push(
        <a
          key="interfaceconfig"
          href={"/interface-config?hostname=" + device.hostname}
        >
          <Icon name="plug" link />
        </a>
      )
    }

    return hostnameExtra;
  }

  mangleDeviceData(devicesData) {
    return devicesData.map((device, index) => {
      let syncStatus = ''
      if (device.state === 'MANAGED') {
        if (device.synchronized === true) {
          syncStatus = (
            <td key={device.id + '_state'}>
              MANAGED / SYNC=
              <Icon name='check' color='green' />
            </td>
          )
        } else {
          syncStatus = (
            <td key={device.id + '_state'}>
              MANAGED / SYNC=
              <Icon name='delete' color='red' />
            </td>
          )
        }
      } else {
        syncStatus = <td key={device.id + '_state'}>{device.state}</td>
      }

      const deviceStateExtra = []
      if (device.state == 'DISCOVERED') {
        deviceStateExtra.push(
          <DeviceInitForm
            key={device.id + '_initform'}
            deviceId={device.id}
            jobIdCallback={this.addDeviceJob.bind(this)} />
        )
      } else if (device.state == 'INIT') {
        if (device.id in this.state.deviceJobs) {
          deviceStateExtra.push(
            <p key='initjobs'>
              Init jobs: {this.state.deviceJobs[device.id].join(', ')}
            </p>
          )
        }
      }

      if (device.deleted !== undefined && device.deleted === true) {
        syncStatus = <td key={device.id + '_state'}>DELETED</td>
      }

      if (device.hostname in this.state.deviceInterfaceData !== false) {
        let deviceButtons = []
        let mlagPeerLink = this.renderMlagLink(
          this.state.deviceInterfaceData[device.hostname]
        )
        if (mlagPeerLink !== null) {
          deviceButtons.push.apply(deviceButtons, mlagPeerLink)
        }
        let uplinkLink = this.renderUplinkLink(
          this.state.deviceInterfaceData[device.hostname]
        )
        if (uplinkLink !== null) {
          deviceButtons.push.apply(deviceButtons, uplinkLink)
        }
        if (deviceButtons.length > 0) {
          deviceStateExtra.push(
            <div key='btngroup'>
              <Button.Group vertical labeled icon>
                {deviceButtons}
              </Button.Group>
            </div>
          )
        }
      }

      let log = {}
      Object.keys(this.state.deviceJobs).map(device_id => {
        log[device_id] = ''
        this.state.deviceJobs[device_id].map(job_id => {
          this.state.logLines.filter(this.checkJobId(job_id)).map(logLine => {
            log[device_id] = log[device_id] + logLine
            const element = document.getElementById(
              'logoutputdiv_device_id_' + device_id
            )
            if (element !== null) {
              element.scrollTop = element.scrollHeight
            }
          })
        })
      })

      let columnData = this.state.displayColumns.map((columnName, colIndex) => {
        return <td key={100 + colIndex}>{device[columnName]}</td>
      })

      const mgmtip = []
      if (device.management_ip) {
        mgmtip.push(...this.createMgmtIP(device.management_ip))
      }
      if (device.secondary_management_ip) {
        mgmtip.push(...this.createMgmtIP(device.secondary_management_ip, "secondary_"))
      }
      if (device.dhcp_ip !== null) {
        mgmtip.push(<i key='dhcp_ip'>(DHCP IP: {device.dhcp_ip})</i>)
      }

      return <DeviceInfoBlock
        key={device.id + "_device_info"}
        device={device}
        hostnameExtra={this.createHostnameExtraForDevice(device)}
        syncStatus={syncStatus}
        columnData={columnData}
        clickRow={this.clickRow.bind(this)}
        colLength={this.state.displayColumns.length}
        menuActions={this.createMenuActionsForDevice(device)}
        mgmtip={mgmtip}
        deviceStateExtra={deviceStateExtra}
        log={log}
      ></DeviceInfoBlock>
    })
  }

  render() {
    let deviceInfo = this.mangleDeviceData(this.state.devicesData)
    if (this.state.error) {
      deviceInfo = [
        <tr key={'errorrow'}>
          <td colSpan='5'>API error: {this.state.error.message}</td>
        </tr>
      ]
    } else if (!Array.isArray(deviceInfo) || !deviceInfo.length) {
      if (this.state.loading) {
        deviceInfo = [
          <tr key={'loadingrow'}>
            <td colSpan='5'>
              <Icon name='spinner' loading={true} />
              Loading devices...
            </td>
          </tr>
        ]
      } else {
        deviceInfo = [
          <tr key={'emptyrow'}>
            <td colSpan='5'>Empty result</td>
          </tr>
        ]
      }
    }

    const perPageOptions = [
      { key: 20, value: 20, text: '20' },
      { key: 50, value: 50, text: '50' },
      { key: 100, value: 100, text: '100' }
    ]

    const allowedColumns = {
      model: 'Model',
      os_version: 'OS version',
      management_ip: 'Management IP',
      dhcp_ip: 'DHCP IP',
      serial: 'Serial'
    }

    let columnHeaders = this.state.displayColumns.map(columnName => {
      return <th key={columnName}>{allowedColumns[columnName]}</th>
    })

    let columnSelectors = Object.keys(allowedColumns).map(
      (columnName, columnIndex) => {
        let checked = false
        if (this.state.displayColumns.indexOf(columnName) !== -1) {
          checked = true
        }
        return (
          <li key={columnIndex}>
            <Checkbox
              defaultChecked={checked}
              label={allowedColumns[columnName]}
              name={columnName}
              onChange={this.columnSelectorChange.bind(this)}
            />
          </li>
        )
      }
    )

    return (
      <section>
        <div id='search'>
          <DeviceSearchForm
            location={this.props.location}
            searchAction={this.searchAction}
          />
        </div>
        <div id='device_list'>
          <h2>Device list</h2>
          <SemanticToastContainer position='top-right' maxToasts={3} />
          <Modal
            onClose={() => this.deleteModalClose()}
            open={this.state.delete_modal_open}
          >
            <Modal.Header>
              Delete device {this.state.delete_modal_device_hostname}
            </Modal.Header>
            <Modal.Content>
              <Modal.Description>
                <p key='confirm'>
                  Are you sure you want to delete device{' '}
                  {this.state.delete_modal_device_hostname} with device ID{' '}
                  {this.state.delete_modal_device_id}? Confirm hostname below to
                  delete
                </p>
                <p key='error' hidden={this.state.delete_modal_error === null}>
                  Error deleting device: {this.state.delete_modal_error}
                </p>
                <Input
                  placeholder='confirm hostname'
                  onChange={this.updateDeleteModalConfirmName.bind(this)}
                />
                <Checkbox
                  label='Reset device to factory default settings when deleting'
                  name='factory_default'
                  checked={this.state.delete_modal_factory_default}
                  disabled={
                    this.state.delete_modal_device_state != 'MANAGED' ||
                    this.state.delete_modal_device_type != 'ACCESS'
                  }
                  onChange={this.deleteDeviceFactoryDefaultAction}
                />
              </Modal.Description>
            </Modal.Content>
            <Modal.Actions>
              <Button
                key='cancel'
                color='black'
                onClick={() => this.setState({ delete_modal_open: false })}
              >
                Cancel
              </Button>
              <Button
                key='submit'
                disabled={
                  this.state.delete_modal_device_hostname !=
                  this.state.delete_modal_confirm_name
                }
                onClick={() => this.deleteDeviceAction()}
                icon
                labelPosition='right'
                negative
              >
                Delete
              </Button>
            </Modal.Actions>
          </Modal>
          <div className='table_options'>
            <Popup
              on='click'
              pinned
              position='bottom right'
              trigger={
                <Button className='table_options_button'>
                  <Icon name='table' />
                </Button>
              }
            >
              <p>Items per page:</p>
              <Select
                options={perPageOptions}
                defaultValue={20}
                onChange={this.updatePerPageOption.bind(this)}
              />
              <p>Show extra columns:</p>
              <ul>{columnSelectors}</ul>
            </Popup>
          </div>
          <div id='data'>
            <table className='device_list'>
              <thead>
                <tr>
                  <th
                    key='hostname'
                    onClick={() => this.sortHeader('hostname')}
                  >
                    Hostname
                    <div className='hostname_sort'>
                      {this.renderSortButton(this.state.hostname_sort)}
                    </div>
                  </th>
                  <th
                    key='device_type'
                    onClick={() => this.sortHeader('device_type')}
                  >
                    Device type
                    <div className='device_type_sort'>
                      {this.renderSortButton(this.state.device_type_sort)}
                    </div>
                  </th>
                  <th key='state' onClick={() => this.sortHeader('state')}>
                    State / Sync status
                    <div className='sync_status_sort'>
                      {this.renderSortButton(this.state.state_sort)}
                    </div>
                  </th>
                  {columnHeaders}
                  <th key='id' onClick={() => this.sortHeader('id')}>
                    ID
                    <div className='sync_status_sort'>
                      {this.renderSortButton(this.state.id_sort)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>{deviceInfo}</tbody>
            </table>
          </div>
          <div>
            <Pagination
              activePage={this.state.activePage}
              totalPages={this.state.totalPages}
              onPageChange={this.pageChange.bind(this)}
            />
          </div>
        </div>
      </section>
    )
  }
}

export default DeviceList
