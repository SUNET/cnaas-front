import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { JobList } from "./JobList";

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
};
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock getResponse
jest.mock("../../utils/getData", () => ({
  getResponse: jest.fn(),
}));

// Mock checkJsonResponse
jest.mock("../../utils/checkJsonResponse", () => {
  return jest.fn((response) => response.json());
});

// Mock useAuthToken
jest.mock("../../contexts/AuthTokenContext", () => ({
  useAuthToken: () => ({ token: "test-token" }),
}));

// Mock LogViewer
jest.mock("../LogViewer", () => {
  return function MockLogViewer({ logs }) {
    if (!logs || logs.length === 0) return null;
    return (
      <section aria-label="log viewer">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </section>
    );
  };
});

// Mock VerifyDiffResult
jest.mock("../ConfigChange/VerifyDiff/VerifyDiffResult", () => {
  return function MockVerifyDiffResult({ deviceNames, deviceData }) {
    return (
      <div data-testid="verify-diff-result">
        {deviceNames.map((name, i) => (
          <div key={i}>
            {name}: {deviceData[i]?.job_tasks?.length || 0} tasks
          </div>
        ))}
      </div>
    );
  };
});

import { getResponse } from "../../utils/getData";

const mockJobs = [
  {
    id: 101,
    function_name: "sync_devices",
    status: "FINISHED",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: "Test sync",
    ticket_ref: "TICKET-123",
    next_job_id: null,
    change_score: 5,
    finished_devices: ["device1", "device2"],
    result: { devices: {} },
  },
  {
    id: 102,
    function_name: "refresh_facts",
    status: "RUNNING",
    scheduled_by: "user1",
    start_time: "2025-01-20T11:00:00",
    finish_time: null,
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: null,
    result: null,
  },
];

function createMockResponse(jobs, totalCount = jobs.length) {
  return Promise.resolve({
    headers: {
      get: (name) => (name === "X-Total-Count" ? String(totalCount) : null),
    },
    json: () => Promise.resolve({ data: { jobs } }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getResponse.mockImplementation(() => createMockResponse(mockJobs));
});

test("displays loading state initially", () => {
  // Never resolve the API call
  getResponse.mockImplementation(() => new Promise(() => {}));

  render(<JobList />);

  expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
});

test("displays jobs table with job data after loading", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  expect(screen.getByText("sync_devices")).toBeInTheDocument();
  expect(screen.getByText("FINISHED")).toBeInTheDocument();
  expect(screen.getByText("admin")).toBeInTheDocument();

  expect(screen.getByText("102")).toBeInTheDocument();
  expect(screen.getByText("refresh_facts")).toBeInTheDocument();
  expect(screen.getByText("RUNNING")).toBeInTheDocument();
  expect(screen.getByText("user1")).toBeInTheDocument();
});

test("displays table headers with sortable columns", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  const columnHeaders = screen.getAllByRole("columnheader");
  expect(columnHeaders).toHaveLength(5);
  expect(columnHeaders[0]).toHaveTextContent("ID");
  expect(columnHeaders[1]).toHaveTextContent("Function name");
  expect(columnHeaders[2]).toHaveTextContent("Status");
  expect(columnHeaders[3]).toHaveTextContent("Scheduled by");
  expect(columnHeaders[4]).toHaveTextContent("Finish time");
});

test("clicking a column header triggers sort API call", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Clear the initial call
  getResponse.mockClear();

  // Click "Status" column header to sort by status
  const columnHeaders = screen.getAllByRole("columnheader");
  await userEvent.click(columnHeaders[2]); // Status column

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=status"),
    "test-token",
  );
});

test("displays error message when API fails", async () => {
  getResponse.mockImplementation(() =>
    Promise.reject({
      json: () => Promise.resolve({ message: "Server error occurred" }),
    }),
  );

  render(<JobList />);

  await waitFor(() => {
    expect(
      screen.getByText(/API error: Server error occurred/),
    ).toBeInTheDocument();
  });
});

test("displays empty result message when no jobs returned", async () => {
  getResponse.mockImplementation(() => createMockResponse([]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("Empty result")).toBeInTheDocument();
  });
});

test("expands job details when clicking a row", async () => {
  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Details row should be hidden initially
  const detailsRow = container.querySelector(".device_details_row");
  expect(detailsRow).toHaveAttribute("hidden");

  // Click on the first job row
  await userEvent.click(screen.getByText("101"));

  // Details row should now be visible
  expect(detailsRow).not.toHaveAttribute("hidden");

  // Should see expanded details
  expect(screen.getByText("Test sync")).toBeInTheDocument();
  expect(screen.getByText("TICKET-123")).toBeInTheDocument();
  expect(screen.getByText("device1, device2")).toBeInTheDocument();
});

test("includes JobSearchForm for filtering", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Search form should be present
  expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
});

test("search triggers API call with filter parameters", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  getResponse.mockClear();

  // Type in search and submit
  await userEvent.type(screen.getByPlaceholderText("Search..."), "103");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[id]=103"),
    "test-token",
  );
});

// Sorting tests
test("clicking ID header twice toggles sort direction", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  const columnHeaders = screen.getAllByRole("columnheader");
  const idHeader = columnHeaders[0];

  // Initial state: sorted descending (↑ shown, meaning -id)
  getResponse.mockClear();

  // First click: should sort ascending (id)
  await userEvent.click(idHeader);
  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=id"),
    "test-token",
  );

  getResponse.mockClear();

  // Second click: should sort descending (-id)
  await userEvent.click(idHeader);
  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=-id"),
    "test-token",
  );
});

test("clicking Function name header triggers sort by function_name", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  getResponse.mockClear();

  const columnHeaders = screen.getAllByRole("columnheader");
  await userEvent.click(columnHeaders[1]); // Function name

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=function_name"),
    "test-token",
  );
});

test("clicking Scheduled by header triggers sort by scheduled_by", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  getResponse.mockClear();

  const columnHeaders = screen.getAllByRole("columnheader");
  await userEvent.click(columnHeaders[3]); // Scheduled by

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=scheduled_by"),
    "test-token",
  );
});

test("clicking Finish time header triggers sort by finish_time", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  getResponse.mockClear();

  const columnHeaders = screen.getAllByRole("columnheader");
  await userEvent.click(columnHeaders[4]); // Finish time

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("sort=finish_time"),
    "test-token",
  );
});

// Search with different filter fields
test("search with function_name field uses contains operator", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Select "Function name" from dropdown
  await userEvent.click(screen.getByRole("listbox"));
  await userEvent.click(screen.getByRole("option", { name: "Function name" }));

  getResponse.mockClear();

  await userEvent.type(screen.getByPlaceholderText("Search..."), "sync");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[function_name][contains]=sync"),
    "test-token",
  );
});

test("search with status field does not use contains operator", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Select "Status" from dropdown
  await userEvent.click(screen.getByRole("listbox"));
  await userEvent.click(screen.getByRole("option", { name: "Status" }));

  getResponse.mockClear();

  await userEvent.type(screen.getByPlaceholderText("Search..."), "FINISHED");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[status]=FINISHED"),
    "test-token",
  );
  expect(getResponse).not.toHaveBeenCalledWith(
    expect.stringContaining("[contains]"),
    expect.anything(),
  );
});

test("search with scheduled_by field uses contains operator", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole("listbox"));
  await userEvent.click(screen.getByRole("option", { name: "Scheduled by" }));

  getResponse.mockClear();

  await userEvent.type(screen.getByPlaceholderText("Search..."), "admin");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[scheduled_by][contains]=admin"),
    "test-token",
  );
});

// Expand/collapse tests
test("collapses job details when clicking expanded row again", async () => {
  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  const detailsRow = container.querySelector(".device_details_row");

  // Click to expand
  await userEvent.click(screen.getByText("101"));
  expect(detailsRow).not.toHaveAttribute("hidden");

  // Click again to collapse
  await userEvent.click(screen.getByText("101"));
  expect(detailsRow).toHaveAttribute("hidden");
});

test("can expand multiple job rows independently", async () => {
  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  const detailsRows = container.querySelectorAll(".device_details_row");
  expect(detailsRows).toHaveLength(2);

  // Both should be hidden initially
  expect(detailsRows[0]).toHaveAttribute("hidden");
  expect(detailsRows[1]).toHaveAttribute("hidden");

  // Expand first row
  await userEvent.click(screen.getByText("101"));
  expect(detailsRows[0]).not.toHaveAttribute("hidden");
  expect(detailsRows[1]).toHaveAttribute("hidden");

  // Expand second row
  await userEvent.click(screen.getByText("102"));
  expect(detailsRows[0]).not.toHaveAttribute("hidden");
  expect(detailsRows[1]).not.toHaveAttribute("hidden");
});

// Job details content tests
test("displays start_arguments in expanded details when present", async () => {
  const jobWithStartArgs = {
    ...mockJobs[0],
    start_arguments: { dry_run: true, hostnames: ["device1"] },
  };
  getResponse.mockImplementation(() => createMockResponse([jobWithStartArgs]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByText("101"));

  expect(screen.getByText("Start arguments")).toBeInTheDocument();
  expect(
    screen.getByText('{"dry_run":true,"hostnames":["device1"]}'),
  ).toBeInTheDocument();
});

test("displays next_job_id in expanded details", async () => {
  const jobWithNextId = {
    ...mockJobs[0],
    next_job_id: 105,
  };
  getResponse.mockImplementation(() => createMockResponse([jobWithNextId]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByText("101"));

  expect(screen.getByText("Next job id")).toBeInTheDocument();
  expect(screen.getByText("105")).toBeInTheDocument();
});

test("displays change_score in expanded details", async () => {
  // Use single job to avoid duplicate "Change score" elements
  const singleJob = { ...mockJobs[0] };
  getResponse.mockImplementation(() => createMockResponse([singleJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByText("101"));

  expect(screen.getByText("Change score")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
});

// Exception job tests
test("displays exception message for EXCEPTION status job", async () => {
  const exceptionJob = {
    id: 103,
    function_name: "sync_devices",
    status: "EXCEPTION",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: null,
    result: null,
    exception: {
      message: "Connection timeout",
      traceback: "Traceback (most recent call last):\n  File...",
    },
  };
  getResponse.mockImplementation(() => createMockResponse([exceptionJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("103")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByText("103"));

  expect(
    screen.getByText("Exception message: Connection timeout"),
  ).toBeInTheDocument();
  expect(screen.getByText("Show exception traceback")).toBeInTheDocument();
});

test("displays empty exception message when exception is null", async () => {
  const exceptionJob = {
    id: 103,
    function_name: "sync_devices",
    status: "EXCEPTION",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: null,
    result: null,
    exception: null,
  };
  getResponse.mockImplementation(() => createMockResponse([exceptionJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("103")).toBeInTheDocument();
  });

  await userEvent.click(screen.getByText("103"));

  expect(screen.getByText("Empty exception")).toBeInTheDocument();
});

// Pagination tests
test("displays pagination controls", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  expect(
    screen.getByRole("navigation", { name: "Pagination Navigation" }),
  ).toBeInTheDocument();
});

test("displays correct total pages based on X-Total-Count header", async () => {
  // 45 total items / 20 per page = 3 pages
  getResponse.mockImplementation(() => createMockResponse(mockJobs, 45));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Should show page numbers 1, 2, 3
  const nav = screen.getByRole("navigation", { name: "Pagination Navigation" });
  expect(nav).toHaveTextContent("1");
  expect(nav).toHaveTextContent("2");
  expect(nav).toHaveTextContent("3");
});

// WebSocket tests
test("sets up websocket connection on mount", async () => {
  const { io } = require("socket.io-client");

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  expect(io).toHaveBeenCalledWith(process.env.API_URL, {
    query: { jwt: "test-token" },
  });
  expect(mockSocket.on).toHaveBeenCalledWith("connect", expect.any(Function));
  expect(mockSocket.on).toHaveBeenCalledWith("events", expect.any(Function));
});

test("cleans up websocket on unmount", async () => {
  const { unmount } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  unmount();

  expect(mockSocket.off).toHaveBeenCalledWith("events");
});

// API call format tests
test("initial API call has correct format", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/v1\.0\/jobs\?sort=-id.*page=1.*per_page=20/),
    "test-token",
  );
});

test("formats finish_time correctly in table", async () => {
  // Use single job to avoid duplicates between table and expanded details
  const singleJob = { ...mockJobs[0] };
  getResponse.mockImplementation(() => createMockResponse([singleJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // The formatISODate utility formats the date - appears in table row and hidden details
  const finishTimes = screen.getAllByText("2025-01-20 10:05:00");
  expect(finishTimes.length).toBeGreaterThanOrEqual(1);
});

test("displays NA for null finish_time", async () => {
  // Use single job with null finish_time
  const runningJob = { ...mockJobs[1] };
  getResponse.mockImplementation(() => createMockResponse([runningJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("102")).toBeInTheDocument();
  });

  // Job 102 has null finish_time - "NA" appears in table row and hidden details
  const naElements = screen.getAllByText("NA");
  expect(naElements.length).toBeGreaterThanOrEqual(1);
});

// Error handling tests
test("handles error without json method", async () => {
  getResponse.mockImplementation(() =>
    Promise.reject({
      message: "Network error",
    }),
  );

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText(/API error: Network error/)).toBeInTheDocument();
  });
});

// Clear search tests
test("clearing search resets filter and reloads data", async () => {
  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Type something in search
  await userEvent.type(screen.getByPlaceholderText("Search..."), "test");

  getResponse.mockClear();

  // Click clear icon
  const clearIcon = container.querySelector("i.delete.icon");
  await userEvent.click(clearIcon);

  // Should call API without filter params
  expect(getResponse).toHaveBeenCalledWith(
    expect.not.stringContaining("filter["),
    "test-token",
  );
});

// Jobs heading test
test("displays Jobs heading", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  expect(
    screen.getByRole("heading", { level: 2, name: "Jobs" }),
  ).toBeInTheDocument();
});

// Pagination page change tests
test("clicking page 2 triggers API call with page=2", async () => {
  // 45 total items = 3 pages
  getResponse.mockImplementation(() => createMockResponse(mockJobs, 45));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  getResponse.mockClear();

  // Click page 2 - Semantic UI pagination uses <a> links, not buttons
  const nav = screen.getByRole("navigation", { name: "Pagination Navigation" });
  const page2Link = nav.querySelector('a[value="2"]');
  await userEvent.click(page2Link);

  await waitFor(() => {
    expect(getResponse).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      "test-token",
    );
  });
});

// Rows collapse on sort/page change tests
test("expanded rows collapse when sorting by a different column", async () => {
  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Expand first row
  await userEvent.click(screen.getByText("101"));
  let detailsRow = container.querySelector(".device_details_row");
  expect(detailsRow).not.toHaveAttribute("hidden");

  // Click a different column header to sort
  const columnHeaders = screen.getAllByRole("columnheader");
  await userEvent.click(columnHeaders[2]); // Status column

  // Re-query the element after re-render and check it's collapsed
  await waitFor(() => {
    detailsRow = container.querySelector(".device_details_row");
    expect(detailsRow).toHaveAttribute("hidden");
  });
});

test("expanded rows collapse when changing page", async () => {
  // 45 total items = 3 pages
  getResponse.mockImplementation(() => createMockResponse(mockJobs, 45));

  const { container } = render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Expand first row
  await userEvent.click(screen.getByText("101"));
  let detailsRow = container.querySelector(".device_details_row");
  expect(detailsRow).not.toHaveAttribute("hidden");

  // Click page 2 - Semantic UI pagination uses <a> links, not buttons
  const nav = screen.getByRole("navigation", { name: "Pagination Navigation" });
  const page2Link = nav.querySelector('a[value="2"]');
  await userEvent.click(page2Link);

  // Re-query the element after re-render and check it's collapsed
  await waitFor(() => {
    detailsRow = container.querySelector(".device_details_row");
    expect(detailsRow).toHaveAttribute("hidden");
  });
});

// Show exception traceback test
test("clicking 'Show exception traceback' reveals traceback text", async () => {
  const exceptionJob = {
    id: 103,
    function_name: "sync_devices",
    status: "EXCEPTION",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: null,
    result: null,
    exception: {
      message: "Connection timeout",
      traceback: "Traceback (most recent call last):\n  File test.py line 42",
    },
  };
  getResponse.mockImplementation(() => createMockResponse([exceptionJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("103")).toBeInTheDocument();
  });

  // Expand the row
  await userEvent.click(screen.getByText("103"));

  // Traceback should not be visible initially
  expect(
    screen.queryByText(/Traceback \(most recent call last\)/),
  ).not.toBeInTheDocument();

  // Click "Show exception traceback"
  await userEvent.click(screen.getByText("Show exception traceback"));

  // Traceback should now be visible
  expect(
    screen.getByText(/Traceback \(most recent call last\)/),
  ).toBeInTheDocument();
});

// Additional filter field tests
test("search with comment field uses contains operator", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Select "Comment" from dropdown
  await userEvent.click(screen.getByRole("listbox"));
  await userEvent.click(screen.getByRole("option", { name: "Comment" }));

  getResponse.mockClear();

  await userEvent.type(
    screen.getByPlaceholderText("Search..."),
    "test comment",
  );
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[comment][contains]=test comment"),
    "test-token",
  );
});

test("search with ticket_ref field uses contains operator", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // Select "Ticket reference" from dropdown
  await userEvent.click(screen.getByRole("listbox"));
  await userEvent.click(
    screen.getByRole("option", { name: "Ticket reference" }),
  );

  getResponse.mockClear();

  await userEvent.type(screen.getByPlaceholderText("Search..."), "TICKET-456");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(getResponse).toHaveBeenCalledWith(
    expect.stringContaining("filter[ticket_ref][contains]=TICKET-456"),
    "test-token",
  );
});

// VerifyDiffResult for sync_devices job test
test("displays VerifyDiffResult for finished sync_devices job with diffs", async () => {
  const syncJob = {
    id: 104,
    function_name: "sync_devices",
    status: "FINISHED",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 10,
    finished_devices: ["switch1", "switch2"],
    result: {
      devices: {
        switch1: { job_tasks: [{ diff: "+new config line" }] },
        switch2: { job_tasks: [{ diff: "-old config line" }] },
      },
    },
  };
  getResponse.mockImplementation(() => createMockResponse([syncJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("104")).toBeInTheDocument();
  });

  // Expand the row
  await userEvent.click(screen.getByText("104"));

  // Should show "Diff results:" header and the mocked VerifyDiffResult
  expect(screen.getByText("Diff results:")).toBeInTheDocument();
  expect(screen.getByTestId("verify-diff-result")).toBeInTheDocument();
  expect(screen.getByText("switch1: 1 tasks")).toBeInTheDocument();
  expect(screen.getByText("switch2: 1 tasks")).toBeInTheDocument();
});

// Init device job details rendering test
test("displays parsed results for init_access_device_step1 job", async () => {
  const initJob = {
    id: 105,
    function_name: "init_access_device_step1",
    status: "FINISHED",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: ["newswitch"],
    result: {
      devices: {
        newswitch: {
          job_tasks: [
            { task_name: "napalm_get", result: "", failed: false },
            {
              task_name: "Generate initial device config",
              result: "config generated",
              failed: false,
            },
            {
              task_name: "ztp_device_cert",
              result: "Certificate installed successfully",
            },
            {
              task_name: "Push base management config",
              result: "Config pushed",
              failed: false,
            },
          ],
        },
      },
    },
  };
  getResponse.mockImplementation(() => createMockResponse([initJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("105")).toBeInTheDocument();
  });

  // Expand the row
  await userEvent.click(screen.getByText("105"));

  // Should show parsed task results
  expect(screen.getByText("New management IP set")).toBeInTheDocument();
  expect(
    screen.getByText("Configuration was generated successfully from template"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Certificate installed successfully"),
  ).toBeInTheDocument();
  expect(screen.getByText("Pushed base configuration")).toBeInTheDocument();
});

test("displays error for init_access_device_step1 job when device kept old IP", async () => {
  const initJob = {
    id: 106,
    function_name: "init_access_device_step1",
    status: "FINISHED",
    scheduled_by: "admin",
    start_time: "2025-01-20T10:00:00",
    finish_time: "2025-01-20T10:05:00",
    comment: null,
    ticket_ref: null,
    next_job_id: null,
    change_score: 0,
    finished_devices: ["newswitch"],
    result: {
      devices: {
        newswitch: {
          job_tasks: [{ task_name: "napalm_get", result: {}, failed: false }],
        },
      },
    },
  };
  getResponse.mockImplementation(() => createMockResponse([initJob]));

  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("106")).toBeInTheDocument();
  });

  // Expand the row
  await userEvent.click(screen.getByText("106"));

  // Should show error about old management IP
  expect(
    screen.getByText("Error: Device kept old management IP"),
  ).toBeInTheDocument();
});

// LogViewer integration test (using mock)
test("LogViewer is not rendered when no log lines exist", async () => {
  render(<JobList />);

  await waitFor(() => {
    expect(screen.getByText("101")).toBeInTheDocument();
  });

  // LogViewer should not be present (returns null when logs empty)
  expect(
    screen.queryByRole("region", { name: "log viewer" }),
  ).not.toBeInTheDocument();
});
