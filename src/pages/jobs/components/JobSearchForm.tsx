import type { ChangeEvent, FormEvent, SyntheticEvent } from "react";
import { useState } from "react";
import { Select, Input, Icon } from "semantic-ui-react";
import Button from "@mui/material/Button";

type SearchActionOptions = {
  readonly filterField?: string | null;
  readonly filterValue?: string | null;
};

type JobSearchFormProps = {
  readonly searchAction: (options: SearchActionOptions) => void;
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

export function JobSearchForm({ searchAction }: JobSearchFormProps) {
  const [searchText, setSearchText] = useState("");
  const [searchField, setSearchField] = useState("id");

  const clearSearch = () => {
    setSearchText("");
    searchAction({ filterField: null, filterValue: null });
  };

  const submitSearch = (e: FormEvent) => {
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
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setSearchText(e.target.value)
        }
        icon={<Icon name="delete" link onClick={clearSearch} />}
        value={searchText}
      />
      <Select
        options={searchOptions}
        defaultValue="id"
        onChange={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (_e: SyntheticEvent, data: any) => setSearchField(String(data.value))
        }
      />
      <Button type="submit" variant="contained">
        Search
      </Button>
    </form>
  );
}
