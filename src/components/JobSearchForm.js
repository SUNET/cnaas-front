import React from "react";
import PropTypes from "prop-types";
import { Button, Select, Input, Icon } from "semantic-ui-react";

JobSearchForm.propTypes = {
  searchAction: PropTypes.func.isRequired,
};

const searchOptions = [
  { key: "id", value: "id", text: "ID" },
  { key: "function_name", value: "function_name", text: "Function name" },
  { key: "status", value: "status", text: "Status" },
  { key: "scheduled_by", value: "scheduled_by", text: "Scheduled by" },
  { key: "comment", value: "comment", text: "Comment" },
  { key: "ticket_ref", value: "ticket_ref", text: "Ticket reference" },
  { key: "finish_time", value: "finish_time", text: "Finish time" },
];

export function JobSearchForm({ searchAction }) {
  const [searchText, setSearchText] = React.useState("");
  const [searchField, setSearchField] = React.useState("id");

  const clearSearch = () => {
    setSearchText("");
    searchAction({ filterField: null, filterValue: null });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    searchAction({
      filterField: searchField,
      filterValue: searchText,
    });
  };

  return (
    <form onSubmit={submitSearch}>
      <Input
        type="text"
        placeholder="Search..."
        action
        onChange={(e) => setSearchText(e.target.value)}
        icon={<Icon name="delete" link onClick={clearSearch} />}
        value={searchText}
      />
      <Select
        options={searchOptions}
        defaultValue="id"
        onChange={(_e, data) => setSearchField(data.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
