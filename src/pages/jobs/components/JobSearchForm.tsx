import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

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
    <Box component="form" onSubmit={submitSearch}>
      <Stack direction="row" spacing={1}>
        <Input
          id="job-search-input"
          endAdornment={
            <InputAdornment position="end" onClick={clearSearch}>
              <CloseIcon />
            </InputAdornment>
          }
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearchText(e.target.value)
          }
          placeholder="Search..."
          value={searchText}
        />
        <Select
          defaultValue="id"
          variant="standard"
          onChange={(event: SelectChangeEvent) =>
            setSearchField(String(event.target.value))
          }
        >
          {searchOptions.map((option) => (
            <MenuItem key={option.key} value={option.key}>
              {option.text}
            </MenuItem>
          ))}
        </Select>
        <Button type="submit" variant="contained">
          Search
        </Button>
      </Stack>
    </Box>
  );
}
