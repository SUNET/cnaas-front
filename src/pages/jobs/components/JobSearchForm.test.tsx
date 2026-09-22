import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { JobSearchForm } from "./JobSearchForm";

const mockSearchAction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function renderComponent(props = {}) {
  const defaultProps = {
    searchAction: mockSearchAction,
  };
  return render(<JobSearchForm {...defaultProps} {...props} />);
}

test("displays search input, dropdown, and submit button", () => {
  renderComponent();

  expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
});

test("calls searchAction with field and value when form is submitted", async () => {
  renderComponent();

  await userEvent.type(screen.getByPlaceholderText("Search..."), "test-query");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(mockSearchAction).toHaveBeenCalledWith({
    filterField: "id",
    filterValue: "test-query",
  });
});

test("calls searchAction with selected field when form is submitted", async () => {
  renderComponent();

  // Open dropdown and select "Status"
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(screen.getByRole("option", { name: "Status" }));

  await userEvent.type(screen.getByPlaceholderText("Search..."), "FINISHED");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(mockSearchAction).toHaveBeenCalledWith({
    filterField: "status",
    filterValue: "FINISHED",
  });
});

test("displays all search field options", async () => {
  renderComponent();

  await userEvent.click(screen.getByRole("combobox"));

  const expectedOptions = [
    "ID",
    "Function name",
    "Status",
    "Scheduled by",
    "Comment",
    "Ticket reference",
    "Finish time",
  ];
  expectedOptions.forEach((optionText) => {
    expect(
      screen.getByRole("option", { name: optionText }),
    ).toBeInTheDocument();
  });
});

test("clears search and calls searchAction with nulls when clear icon is clicked", async () => {
  renderComponent();

  const input = screen.getByPlaceholderText("Search...");
  await userEvent.type(input, "test-query");
  expect(input).toHaveValue("test-query");

  // Click the clear icon (MUI CloseIcon inside the InputAdornment)
  await userEvent.click(screen.getByTestId("CloseIcon"));

  expect(input).toHaveValue("");
  expect(mockSearchAction).toHaveBeenCalledWith({
    filterField: null,
    filterValue: null,
  });
});

test("don't error when search field is empty", async () => {
  renderComponent();

  // Field is empty by default; just submit without typing anything.
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(mockSearchAction).toHaveBeenCalledWith({
    filterField: "id",
    filterValue: "",
  });
});
