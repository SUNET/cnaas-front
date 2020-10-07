import React from "react";
import PropTypes from 'prop-types'
import { Button, Select, Input, Icon } from 'semantic-ui-react'
import queryString from 'query-string';

class DeviceSearchForm extends React.Component {
  state = {
      searchText: "",
      searchField: "hostname"
  };

  updateSearchText(e) {
    const val = e.target.value;
    this.setState({
      searchText: val
    });
  }

  updateSearchField(e, option) {
    const val = option.value;
    this.setState({
      searchField: val
    });
  }

  clearSearch(e) {
    this.setState({
      searchText: ""
    });
    this.props.searchAction({ filterField: null, filterValue: null });
  }

  submitSearch(e) {
    if (e !== null) {
      e.preventDefault();
    }
    console.log("search submitted: "+this.state.searchText+" "+this.state.searchField);
    this.props.searchAction({ filterField: this.state.searchField, filterValue: this.state.searchText});
  }

  componentDidMount() {
    let queryParams = queryString.parse(this.props.location.search);
    if (queryParams.search_id !== undefined) {
      this.setState({
        searchText: queryParams.search_id,
        searchField: "id"
      }, () => {
        this.submitSearch(null);
      })
    } else if (queryParams.search_hostname !== undefined) {
      this.setState({
        searchText: queryParams.search_hostname,
        searchField: "hostname"
      }, () => {
        this.submitSearch(null);
      })
    }
  }

  render() {
    const searchOptions = [
      { 'key': 'hostname', 'value': 'hostname', 'text': 'Hostname' },
      { 'key': 'device_type', 'value': 'device_type', 'text': 'Device type' },
      { 'key': 'state', 'value': 'state', 'text': 'State' },
      { 'key': 'synchronized', 'value': 'synchronized', 'text': 'Synchronized' },
      { 'key': 'management_ip', 'value': 'management_ip', 'text': 'Management IP' },
      { 'key': 'serial', 'value': 'serial', 'text': 'Serial number' },
      { 'key': 'ztp_mac', 'value': 'ztp_mac', 'text': 'MAC' },
      { 'key': 'platform', 'value': 'platform', 'text': 'Platform' },
      { 'key': 'vendor', 'value': 'vendor', 'text': 'Vendor' },
      { 'key': 'model', 'value': 'model', 'text': 'Hardware model' },
      { 'key': 'os_version', 'value': 'os_version', 'text': 'OS version' },
      { 'key': 'id', 'value': 'id', 'text': 'ID' },
    ]

    return (
      <form onSubmit={this.submitSearch.bind(this)}>
        <Input type='text' placeholder='Search...' action
          onChange={this.updateSearchText.bind(this)}
          icon={<Icon name='delete' link onClick={this.clearSearch.bind(this)}/>}
          value={this.state.searchText}
        />
        <Select options={searchOptions} defaultValue='hostname' onChange={this.updateSearchField.bind(this)} />
        <Button type='submit'>Search</Button>
      </form>
    );

  }
}

DeviceSearchForm.propTypes = {
  searchAction: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired
}

export default DeviceSearchForm;