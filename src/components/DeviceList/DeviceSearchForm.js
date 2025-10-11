import queryString from "query-string";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Icon, Input, Select } from "semantic-ui-react";

const searchOptions = [
  { key: "hostname", value: "hostname", text: "Hostname" },
  { key: "device_type", value: "device_type", text: "Device type" },
  { key: "state", value: "state", text: "State" },
  { key: "synchronized", value: "synchronized", text: "Synchronized" },
  { key: "management_ip", value: "management_ip", text: "Management IP" },
  { key: "serial", value: "serial", text: "Serial number" },
  { key: "ztp_mac", value: "ztp_mac", text: "MAC" },
  { key: "platform", value: "platform", text: "Platform" },
  { key: "vendor", value: "vendor", text: "Vendor" },
  { key: "model", value: "model", text: "Hardware model" },
  { key: "os_version", value: "os_version", text: "OS version" },
  { key: "id", value: "id", text: "ID" },
];

const parseFilterKey = (queryParams) => {
  // match contents in square brackets of "filter[]"
  const squareBracketContents = /filter\[(.*?)\]/;
  const firstKey = Object.keys(queryParams)?.[0];
  return firstKey?.match(squareBracketContents)?.[1];
};

function DeviceSearchForm({ searchAction }) {
  const location = useLocation();
  const queryParams = queryString.parse(location.search);

  // match first value in queryParams
  const [searchText, setSearchText] = useState(
    Object.values(queryParams)?.[0] || "",
  );
  const [searchField, setSearchField] = useState(
    parseFilterKey(queryParams) || "hostname",
  );

  useEffect(() => {
    // special handling of queryParams "search_id" and "search_hostname"
    if (queryParams?.search_id) {
      setSearchField("id");
      setSearchText(queryParams.search_id);
      searchAction({
        filterField: "id",
        filterValue: queryParams.search_id,
      });
    } else if (queryParams?.search_hostname) {
      setSearchField("hostname");
      setSearchText(queryParams.search_hostname);
      searchAction({
        filterField: "hostname",
        filterValue: queryParams.search_hostname,
      });
    } else {
      // Else set values from "filter[<searchField>]=<searchText>"
      setSearchText(Object.values(queryParams)?.[0] || "");
      setSearchField(parseFilterKey(queryParams) || "hostname");
    }
  }, [location]);

  const clearSearch = () => {
    setSearchText("");
    searchAction({
      filterField: null,
      filterValue: null,
    });
  };

  const submitSearch = (event) => {
    event?.preventDefault();
    if (!searchText) {
      return;
    }
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
        onChange={(_e, option) => setSearchField(option.value)}
        value={searchField}
      />
      <Button type="submit" onClick={submitSearch}>
        Search
      </Button>
    </form>
  );
}

export default DeviceSearchForm;
