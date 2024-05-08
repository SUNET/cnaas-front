import React from "react";
import PropTypes from "prop-types";
import { Button, Select, Input, Icon } from "semantic-ui-react";

class JobSearchForm extends React.Component {
  state = {
    searchText: "",
    searchField: "id",
  };

  updateSearchText(e) {
    const val = e.target.value;
    this.setState({
      searchText: val,
    });
  }

  updateSearchField(e, option) {
    const val = option.value;
    this.setState({
      searchField: val,
    });
  }

  clearSearch(e) {
    this.setState({
      searchText: "",
    });
    this.props.searchAction({ filterField: null, filterValue: null });
  }

  submitSearch(e) {
    e.preventDefault();
    console.log(
      `search submitted: ${this.state.searchText} ${this.state.searchField}`,
    );
    this.props.searchAction({
      filterField: this.state.searchField,
      filterValue: this.state.searchText,
    });
  }

  render() {
    const searchOptions = [
      { key: "id", value: "id", text: "ID" },
      { key: "function_name", value: "function_name", text: "Function name" },
      { key: "status", value: "status", text: "Status" },
      { key: "scheduled_by", value: "scheduled_by", text: "Scheduled by" },
      { key: "comment", value: "comment", text: "Comment" },
      { key: "ticket_ref", value: "ticket_ref", text: "Ticket reference" },
      { key: "finish_time", value: "finish_time", text: "Finish time" },
    ];

    return (
      <form onSubmit={this.submitSearch.bind(this)}>
        <Input
          type="text"
          placeholder="Search..."
          action
          onChange={this.updateSearchText.bind(this)}
          icon={
            <Icon name="delete" link onClick={this.clearSearch.bind(this)} />
          }
          value={this.state.searchText}
        />
        <Select
          options={searchOptions}
          defaultValue="id"
          onChange={this.updateSearchField.bind(this)}
        />
        <Button type="submit">Search</Button>
      </form>
    );
  }
}

JobSearchForm.propTypes = {
  searchAction: PropTypes.func.isRequired,
};

export default JobSearchForm;
