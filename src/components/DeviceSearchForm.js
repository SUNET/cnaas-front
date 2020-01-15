import React from "react";
import PropTypes from 'prop-types'
import { Button, Select, Input, Icon } from 'semantic-ui-react'

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
    e.preventDefault();
    console.log("search submitted: "+this.state.searchText+" "+this.state.searchField);
    this.props.searchAction({ filterField: this.state.searchField, filterValue: this.state.searchText});
  }

  render() {
    const searchOptions = [
      { 'key': 'hostname', 'value': 'hostname', 'text': 'Hostname' },
      { 'key': 'id', 'value': 'id', 'text': 'ID' },
      { 'key': 'management_ip', 'value': 'management_ip', 'text': 'Management IP' },
      { 'key': 'serial', 'value': 'serial', 'text': 'Serial number' },
      { 'key': 'ztp_mac', 'value': 'ztp_mac', 'text': 'MAC' },
      { 'key': 'platform', 'value': 'platform', 'text': 'Platform' },
      { 'key': 'vendor', 'value': 'vendor', 'text': 'Vendor' },
      { 'key': 'model', 'value': 'model', 'text': 'Hardware model' },
      { 'key': 'os_version', 'value': 'os_version', 'text': 'OS version' },
      { 'key': 'state', 'value': 'state', 'text': 'State' },
    ]

    return (
      <form onSubmit={this.submitSearch.bind(this)}>
        <Input type='text' placeholder='Search...' action
          onChange={this.updateSearchText.bind(this)}
          icon={<Icon name='delete' link onClick={this.clearSearch.bind(this)}/>}
          value={this.state.searchText}
        />
        <Select compact options={searchOptions} defaultValue='hostname' onChange={this.updateSearchField.bind(this)} />
        <Button type='submit'>Search</Button>
      </form>
    );

  }
}

DeviceSearchForm.propTypes = {
  searchAction: PropTypes.func.isRequired,
}

export default DeviceSearchForm;