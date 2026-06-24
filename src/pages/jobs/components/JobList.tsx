import type { ReactNode } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import { JobRow } from "./JobRow";
import { JobSearchForm } from "./JobSearchForm";
import LogViewer from "../../../components/LogViewer";
import { useJobList } from "../stores/JobListContext";

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "function_name", label: "Function name" },
  { key: "status", label: "Status" },
  { key: "scheduled_by", label: "Scheduled by" },
  { key: "finish_time", label: "Finish time" },
] as const;

export function JobList() {
  const { state, sortByColumn, setFilter, setPage, toggleRow } = useJobList();
  const { jobs, loading, error, sort, expandedRows, totalPages, logLines } =
    state;

  // --- Search action (adapter for JobSearchForm) ---

  const searchAction = (options: {
    filterField?: string | null;
    filterValue?: string | null;
  }) => {
    setFilter({
      field: options.filterField ?? null,
      value: options.filterValue ?? null,
    });
  };

  // --- Table body ---

  const renderTableBody = (): ReactNode => {
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={COLUMNS.length}>API error: {error}</TableCell>
        </TableRow>
      );
    }

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={COLUMNS.length}>
            <CircularProgress
              size="var(--size-md)"
              sx={{ marginRight: "var(--size-xxs)", verticalAlign: "middle" }}
            />
            Loading jobs...
          </TableCell>
        </TableRow>
      );
    }

    if (jobs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={COLUMNS.length}>Empty result</TableCell>
        </TableRow>
      );
    }

    return jobs.map((job) => (
      <JobRow
        key={job.id}
        job={job}
        isExpanded={expandedRows.has(job.id)}
        onToggle={() => toggleRow(job.id)}
      />
    ));
  };

  return (
    <section>
      <div id="search">
        <JobSearchForm searchAction={searchAction} />
      </div>
      <LogViewer logs={logLines} />
      <h2>Jobs</h2>
      <TableContainer>
        <Table aria-label="Jobs" size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.key}
                  sortDirection={
                    sort.column === column.key ? sort.direction : false
                  }
                  onClick={() => sortByColumn(column.key)}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  <TableSortLabel
                    active={sort.column === column.key}
                    direction={
                      sort.column === column.key ? sort.direction : "asc"
                    }
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </TableContainer>
      <Pagination
        aria-label="Pagination Navigation"
        count={totalPages}
        page={state.activePage}
        onChange={(_event, page) => setPage(page)}
        sx={{ marginTop: "var(--size-md)" }}
      />
    </section>
  );
}
