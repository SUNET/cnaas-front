import type { MouseEvent, ReactNode } from "react";
import {
  Icon,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import { JobRow } from "./JobRow";
import { JobSearchForm } from "./JobSearchForm";
import LogViewer from "../../../components/LogViewer";
import { useJobList } from "../stores/JobListContext";

export function JobList() {
  const { state, sortByColumn, setFilter, setPage, toggleRow } = useJobList();

  const { jobs, loading, error, sort, expandedRows, totalPages, logLines } =
    state;

  // --- Sort indicator ---

  const getSortIndicator = (column: string): string => {
    if (sort.column !== column) return "";
    return sort.direction === "desc" ? "\u2191" : "\u2193";
  };

  const renderSortButton = (indicator: string): ReactNode => {
    if (indicator === "\u2191") {
      return <Icon name="sort up" />;
    }
    if (indicator === "\u2193") {
      return <Icon name="sort down" />;
    }
    return <Icon name="sort" />;
  };

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

  // --- Page change ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageChange = (_e: MouseEvent<HTMLAnchorElement>, data: any) => {
    setPage(Number(data.activePage));
  };

  // --- Table body ---

  const renderTableBody = (): ReactNode => {
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5}>API error: {error}</TableCell>
        </TableRow>
      );
    }

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5}>
            <Icon name="spinner" loading />
            Loading jobs...
          </TableCell>
        </TableRow>
      );
    }

    if (jobs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5}>Empty result</TableCell>
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
      <Table striped>
        <TableHeader>
          <TableRow key="header">
            <TableHeaderCell onClick={() => sortByColumn("id")} key="0">
              ID
              <div className="sync_status_sort">
                {renderSortButton(getSortIndicator("id"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell
              onClick={() => sortByColumn("function_name")}
              key="1"
            >
              Function name
              <div className="hostname_sort">
                {renderSortButton(getSortIndicator("function_name"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell onClick={() => sortByColumn("status")} key="2">
              Status
              <div className="device_type_sort">
                {renderSortButton(getSortIndicator("status"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell
              onClick={() => sortByColumn("scheduled_by")}
              key="3"
            >
              Scheduled by
              <div className="sync_status_sort">
                {renderSortButton(getSortIndicator("scheduled_by"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell
              onClick={() => sortByColumn("finish_time")}
              key="4"
            >
              Finish time
              <div className="sync_status_sort">
                {renderSortButton(getSortIndicator("finish_time"))}
              </div>
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableBody()}</TableBody>
      </Table>
      <Pagination
        activePage={state.activePage}
        totalPages={totalPages}
        onPageChange={pageChange}
      />
    </section>
  );
}
