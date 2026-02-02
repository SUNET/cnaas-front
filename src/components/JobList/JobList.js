import { useEffect, useRef, useState } from "react";
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
import checkJsonResponse from "../../utils/checkJsonResponse";
import { getResponse } from "../../utils/getData";
import { JobRow } from "./JobRow";
import { JobSearchForm } from "./JobSearchForm";
import LogViewer from "../LogViewer";
import { useAuthToken } from "../../contexts/AuthTokenContext";

import { io } from "socket.io-client";

let socket = null;

export function JobList() {
  const { token } = useAuthToken();

  const [filter, setFilter] = useState({ field: null, value: null });
  const [sort, setSort] = useState({
    column: "id",
    direction: "desc",
    field: "-id",
  });
  const [jobsData, setJobsData] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logLines, setLogLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Ref to hold the latest getJobsData function for use in socket handlers
  const getJobsDataRef = useRef(null);

  const hasJobLog = (logLine) => {
    return logLine.toLowerCase().includes("job #");
  };

  const readHeaders = (response) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      const totalPages = Math.ceil(totalCountHeader / 20);
      setTotalPages(totalPages);
    }

    return response;
  };

  const fetchJobs = async (
    sortField = "id",
    filterField,
    filterValue,
    pageNum,
  ) => {
    setLoading(true);
    setError(null);

    // Build filter part of the URL to only return specific devices from the API
    let filterParams = "";
    let filterFieldOperator = "";
    const stringFields = [
      "function_name",
      "scheduled_by",
      "ticket_ref",
      "comment",
    ];
    if (filterField !== null && filterValue !== null) {
      if (stringFields.indexOf(filterField) !== -1) {
        filterFieldOperator = "[contains]";
      }
      filterParams = `&filter[${filterField}]${filterFieldOperator}=${filterValue}`;
    }
    try {
      const response = await getResponse(
        `${process.env.API_URL}/api/v1.0/jobs?sort=${sortField}${filterParams}&page=${pageNum}&per_page=20`,
        token,
      );
      readHeaders(response);
      const data = await checkJsonResponse(response);
      setJobsData(data.data.jobs);
      setLoading(false);
    } catch (error) {
      if (typeof error.json === "function") {
        const jsonError = await error.json();
        setJobsData([]);
        setLoading(false);
        setError(jsonError.message);
      } else {
        setJobsData([]);
        setLoading(false);
        setError(error.message);
      }
    }
  };

  const getJobsData = (options) => {
    options = options ?? {};
    const newSortField = options.sortField || sort.field;
    if (options.sortField !== undefined) {
      setSort((prev) => ({ ...prev, field: newSortField }));
    }

    const newFilterField =
      options.filterField !== undefined ? options.filterField : filter.field;
    const newFilterValue =
      options.filterValue !== undefined ? options.filterValue : filter.value;
    if (
      options.filterField !== undefined &&
      options.filterValue !== undefined
    ) {
      setFilter({ field: newFilterField, value: newFilterValue });
    }

    const newActivePage = options.pageNum || activePage;
    if (options.pageNum !== undefined) {
      setActivePage(newActivePage);
    }

    fetchJobs(newSortField, newFilterField, newFilterValue, newActivePage);
  };

  /**
   * Handle sorting on different columns when clicking the header fields
   */
  const sortHeader = (header) => {
    let newDirection;

    if (sort.column === header) {
      // Toggle direction if clicking same column
      newDirection = sort.direction === "desc" ? "asc" : "desc";
    } else {
      // New column: start with ascending
      newDirection = "asc";
    }

    const newSortField = newDirection === "desc" ? `-${header}` : header;

    setSort({
      column: header,
      direction: newDirection,
      field: newSortField,
    });
    getJobsData({ sortField: newSortField });
    setExpandedRows(new Set());
  };

  // Keep ref updated with latest getJobsData
  useEffect(() => {
    getJobsDataRef.current = getJobsData;
  });

  useEffect(() => {
    getJobsData();

    socket = io(process.env.API_URL, { query: { jwt: token } });
    socket.on("connect", () => {
      const emitJobStatus = socket.emit("events", { update: "job" });
      if (emitJobStatus?.connected) {
        setLogLines((prevLogLines) => [
          ...prevLogLines,
          "Listening to job update events\n",
        ]);
      }
      const emitLogLeveltStatus = socket.emit("events", { loglevel: "DEBUG" });
      if (emitLogLeveltStatus?.connected) {
        setLogLines((prevLogLines) => [
          ...prevLogLines,
          "Listening to log message events\n",
        ]);
      }
    });

    socket.on("events", (data) => {
      // job update event
      if (data.job_id) {
        setLogLines((prevLogLines) => {
          const newLogLines = [...prevLogLines];
          if (data.status === "EXCEPTION") {
            newLogLines.push(
              `job #${data.job_id} changed status to ${data.status}: ${data.exception}\n`,
            );
          } else {
            newLogLines.push(
              `job #${data.job_id} changed status to ${data.status}\n`,
            );
          }

          if (newLogLines.length >= 1000) {
            newLogLines.shift();
          }

          return newLogLines;
        });

        getJobsDataRef.current();
      } else if (typeof data === "string" || data instanceof String) {
        setLogLines((prevLogLines) => {
          const newLogLines = [...prevLogLines];
          if (hasJobLog(data)) {
            newLogLines.push(`${data}\n`);
          }

          if (newLogLines.length >= 1000) {
            newLogLines.shift();
          }
          return newLogLines;
        });
      }
    });

    return () => {
      if (socket !== null) {
        socket.off("events");
      }
    };
  }, []);

  // Helper to get sort indicator for a column
  const getSortIndicator = (column) => {
    if (sort.column !== column) return "";
    return sort.direction === "desc" ? "↑" : "↓";
  };

  /**
   * Handle expand/collapse of device details when clicking a row in the table
   */
  const toggleRow = (jobId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const pageChange = (_e, data) => {
    getJobsData({ pageNum: data.activePage });
    setExpandedRows(new Set());
  };

  const renderSortButton = (sort) => {
    if (sort === "↑") {
      return <Icon name="sort up" />;
    }
    if (sort === "↓") {
      return <Icon name="sort down" />;
    }
    return <Icon name="sort" />;
  };

  const renderTableBody = () => {
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan="5">API error: {error}</TableCell>
        </TableRow>
      );
    }

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan="5">
            <Icon name="spinner" loading />
            Loading jobs...
          </TableCell>
        </TableRow>
      );
    }

    if (jobsData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan="5">Empty result</TableCell>
        </TableRow>
      );
    }

    return jobsData.map((job) => (
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
        <JobSearchForm searchAction={getJobsData} />
      </div>
      <LogViewer logs={logLines} />
      <h2>Jobs</h2>
      <Table striped>
        <TableHeader>
          <TableRow key="header">
            <TableHeaderCell onClick={() => sortHeader("id")} key="0">
              ID
              <div className="sync_status_sort">
                {renderSortButton(getSortIndicator("id"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell
              onClick={() => sortHeader("function_name")}
              key="1"
            >
              Function name
              <div className="hostname_sort">
                {renderSortButton(getSortIndicator("function_name"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell onClick={() => sortHeader("status")} key="2">
              Status
              <div className="device_type_sort">
                {renderSortButton(getSortIndicator("status"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell onClick={() => sortHeader("scheduled_by")} key="3">
              Scheduled by
              <div className="sync_status_sort">
                {renderSortButton(getSortIndicator("scheduled_by"))}
              </div>
            </TableHeaderCell>
            <TableHeaderCell onClick={() => sortHeader("finish_time")} key="4">
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
        defaultActivePage={1}
        totalPages={totalPages}
        onPageChange={pageChange}
      />
    </section>
  );
}
