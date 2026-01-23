import React from "react";
import {
  Grid,
  GridColumn,
  Icon,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "semantic-ui-react";
import checkJsonResponse from "../utils/checkJsonResponse";
import { formatISODate } from "../utils/formatters";
import { getResponse } from "../utils/getData";
import VerifyDiffResult from "./ConfigChange/VerifyDiff/VerifyDiffResult";
import { JobSearchForm } from "./JobSearchForm";
import LogViewer from "./LogViewer";

const io = require("socket.io-client");

let socket = null;

class JobList extends React.Component {
  state = {
    sortField: "-id",
    filterField: null,
    filterValue: null,
    function_name_sort: "",
    status_sort: "",
    scheduled_by_sort: "",
    finish_time_sort: "",
    id_sort: "↑",
    jobsData: [],
    activePage: 1,
    totalPages: 1,
    logLines: [],
    loading: true,
    error: null,
  };

  getJobsData = (options) => {
    if (options === undefined) options = {};
    const newState = this.state;
    if (options.sortField !== undefined) {
      newState.sortField = options.sortField;
    }
    if (
      options.filterField !== undefined &&
      options.filterValue !== undefined
    ) {
      newState.filterField = options.filterField;
      newState.filterValue = options.filterValue;
    }
    if (options.pageNum !== undefined) {
      newState.activePage = options.pageNum;
    }
    this.setState(newState);
    return this.getJobsAPIData(
      newState.sortField,
      newState.filterField,
      newState.filterValue,
      newState.activePage,
    );
  };

  /**
   * Handle sorting on different columns when clicking the header fields
   */
  sortHeader = (header) => {
    const newState = this.state;
    let sortField = "-id";
    const oldValue = this.state[`${header}_sort`];
    newState.function_name_sort = "";
    newState.status_sort = "";
    newState.scheduled_by_sort = "";
    newState.finish_time_sort = "";
    newState.id_sort = "";
    if (oldValue == "" || oldValue == "↑") {
      newState[`${header}_sort`] = "↓";
      sortField = header;
    } else if (oldValue == "↓") {
      newState[`${header}_sort`] = "↑";
      sortField = `-${header}`;
    }
    this.setState(newState);
    this.getJobsData({ sortField });
    // Close all expanded table rows when resorting the table
    const deviceDetails = document.getElementsByClassName("device_details_row");
    for (let i = 0; i < deviceDetails.length; i++) {
      deviceDetails[i].hidden = true;
    }
  };

  componentDidMount() {
    const credentials = localStorage.getItem("token");
    if (credentials === null) {
      throw "no API token found";
    }
    this.getJobsData();
    socket = io(process.env.API_URL, { query: { jwt: credentials } });
    socket.on("connect", () => {
      console.log("Websocket connected!");
      const newLogLines = [];
      var ret = socket.emit("events", { update: "job" });
      if (ret !== undefined && ret.connected) {
        newLogLines.push("Listening to job update events\n");
      }
      var ret = socket.emit("events", { loglevel: "DEBUG" });
      if (ret !== undefined && ret.connected) {
        newLogLines.push("Listening to log message events\n");
      }
      this.setState({ logLines: newLogLines });
    });
    socket.on("events", (data) => {
      const newLogLines = [...this.state.logLines];
      // job update event
      if (data.job_id !== undefined) {
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        if (data.status === "EXCEPTION") {
          newLogLines.push(
            `job #${data.job_id} changed status to ${data.status}: ${data.exception}\n`,
          );
        } else {
          newLogLines.push(
            `job #${data.job_id} changed status to ${data.status}\n`,
          );
        }
        this.setState({ logLines: newLogLines });
        this.getJobsData();
      } else if (typeof data === "string" || data instanceof String) {
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        if (this.checkJobLog(data)) {
          newLogLines.push(`${data}\n`);
          this.setState({ logLines: newLogLines });
        }
      }
    });
  }

  componentWillUnmount() {
    if (socket !== null) {
      socket.off("events");
    }
  }

  readHeaders = (response) => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log(`total: ${totalCountHeader}`);
      const totalPages = Math.ceil(totalCountHeader / 20);
      this.setState({ totalPages });
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
    return response;
  };

  getJobsAPIData = (sortField = "id", filterField, filterValue, pageNum) => {
    const credentials = localStorage.getItem("token");
    this.setState({ loading: true, error: null });
    // Build filter part of the URL to only return specific devices from the API
    // TODO: filterValue should probably be urlencoded?
    let filterParams = "";
    let filterFieldOperator = "";
    const stringFields = [
      "function_name",
      "scheduled_by",
      "ticket_ref",
      "comment",
    ];
    if (filterField != null && filterValue != null) {
      if (stringFields.indexOf(filterField) !== -1) {
        filterFieldOperator = "[contains]";
      }
      filterParams = `&filter[${filterField}]${filterFieldOperator}=${filterValue}`;
    }
    getResponse(
      `${process.env.API_URL}/api/v1.0/jobs?sort=${sortField}${filterParams}&page=${pageNum}&per_page=20`,
      credentials,
    )
      .then((response) => this.readHeaders(response))
      .then((response) => checkJsonResponse(response))
      .then((data) => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              jobsData: data.data.jobs,
              loading: false,
            },
            () => {
              console.log("this is new state", this.state.devicesData);
            },
          );
        }
      })
      .catch((error) => {
        if (typeof error.json === "function") {
          error.json().then((jsonError) => {
            this.setState({
              jobsData: [],
              loading: false,
              error: jsonError.message,
            });
          });
        } else {
          this.setState({
            jobsData: [],
            loading: false,
            error: error.message,
          });
        }
      });
  };

  /**
   * Handle expand/collapse of device details when clicking a row in the table
   */
  clickRow(e) {
    const curState = e.target.closest("tr").nextElementSibling.hidden;
    if (curState) {
      e.target.closest("tr").nextElementSibling.hidden = false;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className =
          "angle down icon";
      } catch {
        console.log("Could not highlight or change icon for expanded row");
      }
    } else {
      e.target.closest("tr").nextElementSibling.hidden = true;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className =
          "angle right icon";
      } catch {
        console.log("Could not change icon for collapsed row");
      }
    }
  }

  pageChange(e, data) {
    // Update active page and then reload data
    this.setState({ activePage: data.activePage }, () =>
      this.getJobsData({ numPage: data.activePage }),
    );
    const tablerows = document.getElementsByClassName("device_details_row");
    let i;
    for (i = 0; i < tablerows.length; i++) {
      tablerows[i].hidden = true;
      try {
        tablerows[
          i
        ].previousElementSibling.firstElementChild.firstElementChild.className =
          "angle right icon";
      } catch {
        console.log("Could not change icon for collapsed row");
      }
    }
  }

  checkJobId(job_id) {
    return function (logLine) {
      return logLine.toLowerCase().includes(`job #${job_id}`);
    };
  }

  renderSortButton(sort) {
    if (sort === "↑") {
      return <Icon name="sort up" />;
    }
    if (sort === "↓") {
      return <Icon name="sort down" />;
    }
    return <Icon name="sort" />;
  }

  showException(id) {
    console.log("unhide: ", id);
    const element = document.getElementById(`exception_traceback_${id}`);
    if (element !== undefined) {
      element.hidden = false;
    }
  }

  checkJobLog(logLine) {
    return logLine.toLowerCase().includes("job #");
  }

  renderJobDetails(job, index) {
    if (job.status === "EXCEPTION") {
      if (job.exception !== undefined && job.exception !== null) {
        return [
          <p key={`exch_${index}`}>
            Exception message: {job.exception.message}
          </p>,
          <p key={`excth_${index}`}>
            <a href="#" onClick={() => this.showException(index)}>
              Show exception traceback
            </a>
          </p>,
          <pre key={`exct_${index}`} id={`exception_traceback_${index}`} hidden>
            {job.exception.traceback}
          </pre>,
        ];
      }
      return [<p key={index}>Empty exception</p>];
    }
    if (job.status === "FINISHED") {
      if (
        typeof job.function_name === "string" &&
        job.function_name.startsWith("sync_devices")
      ) {
        const devicesObj = job.result.devices;
        const deviceNames = Object.keys(devicesObj);
        const deviceData = Object.values(devicesObj);
        return [
          <p key="diffres_header">Diff results: </p>,
          <VerifyDiffResult
            key="diffres"
            deviceNames={deviceNames}
            deviceData={deviceData}
          />,
        ];
      }
      if (
        job.function_name === "init_access_device_step1" ||
        job.function_name === "init_fabric_device_step1"
      ) {
        const deviceResult = Object.values(job.result.devices);
        const results = deviceResult[0].job_tasks
          .map((task) => {
            if (task.task_name === "napalm_get") {
              // before v1.6 failed init jobs would have napalm_get output in result and failed = false on napalm_get task
              if (
                (typeof task.result === "string" &&
                  task.result.length === 0 &&
                  task.failed === true) ||
                (typeof task.result === "object" && task.failed === false)
              ) {
                return "Error: Device kept old management IP";
              }
              return "New management IP set";
            }
            if (task.task_name === "Generate initial device config") {
              if (task.failed === true) {
                return `Error: Failed to generate configuration from template: ${task.result}`;
              }
              return "Configuration was generated successfully from template";
            }
            if (task.task_name === "ztp_device_cert") {
              return task.result;
            }
            // push config will have status failed pre v1.6 because timeout after changing IP, ignore failed status and look at exception type
            if (task.task_name === "Push base management config") {
              if (
                typeof task.result === "string" &&
                task.result.includes("ReplaceConfigException")
              ) {
                return `Error: Failed to push configuration: ${task.result}`;
              }
              return "Pushed base configuration";
            }
          })
          .filter((result) => {
            if (result !== undefined) {
              return result;
            }
          });
        return results.map((result, index) => {
          return <p key={index}>{result}</p>;
        });
      }
      return [<pre key={index}>{JSON.stringify(job.result, null, 2)}</pre>];
    }
    return [<pre key={index}>{JSON.stringify(job.result, null, 2)}</pre>];
  }

  render() {
    const { jobsData, logLines } = this.state;

    let logViewer = <LogViewer logs={logLines} />;

    let jobTableBody = jobsData.map((job, index) => {
      const jobDetails = this.renderJobDetails(job, index);
      let finishedDevices = "";
      if (job.finished_devices !== null) {
        finishedDevices = job.finished_devices.join(", ");
      }
      let startArgs = null;
      if ("start_arguments" in job && job.start_arguments) {
        startArgs = (
          <TableRow key="4">
            <TableCell>Start arguments</TableCell>
            <TableCell>
              {JSON.stringify(job.start_arguments, null, 0)}
            </TableCell>
          </TableRow>
        );
      }

      return [
        <TableRow
          key={`job_header_${job.id}`}
          onClick={this.clickRow.bind(this)}
        >
          <TableCell key="0">
            <Icon name="angle right" />
            {job.id}
          </TableCell>
          <TableCell key="1">{job.function_name}</TableCell>
          <TableCell key="2">{job.status}</TableCell>
          <TableCell key="3">{job.scheduled_by}</TableCell>
          <TableCell key="4">{formatISODate(job.finish_time)}</TableCell>
        </TableRow>,
        <TableRow
          key={`job_content_${job.id}`}
          className="device_details_row"
          hidden
        >
          <TableCell style={{ display: "block" }}>
            <Grid columns={2}>
              <GridColumn>
                <Table compact basic={"very"}>
                  <TableBody>
                    <TableRow key="0">
                      <TableCell>Start time</TableCell>
                      <TableCell>{formatISODate(job.start_time)}</TableCell>
                    </TableRow>
                    <TableRow key="1">
                      <TableCell>Finish time</TableCell>
                      <TableCell>{formatISODate(job.finish_time)}</TableCell>
                    </TableRow>
                    <TableRow key="2">
                      <TableCell>Comment</TableCell>
                      <TableCell>{job.comment}</TableCell>
                    </TableRow>
                    <TableRow key="3">
                      <TableCell>Ticket reference</TableCell>
                      <TableCell>{job.ticket_ref}</TableCell>
                    </TableRow>
                    {startArgs}
                    <TableRow key="5">
                      <TableCell>Next job id</TableCell>
                      <TableCell>{job.next_job_id}</TableCell>
                    </TableRow>
                    <TableRow key="6">
                      <TableCell>Change score</TableCell>
                      <TableCell>{job.change_score}</TableCell>
                    </TableRow>
                    <TableRow key="7">
                      <TableCell>Finished devices</TableCell>
                      <TableCell>{finishedDevices}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </GridColumn>
              <GridColumn width={16}>{jobDetails}</GridColumn>
            </Grid>
          </TableCell>
        </TableRow>,
      ];
    });
    if (this.state.error) {
      jobTableBody = [
        <TableRow key="error">
          <TableCell colSpan="5">API error: {this.state.error}</TableCell>
        </TableRow>,
      ];
    } else if (!Array.isArray(jobTableBody) || !jobTableBody.length) {
      if (this.state.loading) {
        jobTableBody = [
          <TableRow key="loading">
            <TableCell colSpan="5">
              <Icon name="spinner" loading />
              Loading jobs...
            </TableCell>
          </TableRow>,
        ];
      } else {
        jobTableBody = [
          <TableRow key="empty">
            <TableCell colSpan="5">Empty result</TableCell>
          </TableRow>,
        ];
      }
    }

    return (
      <section>
        <div id="search">
          <JobSearchForm searchAction={this.getJobsData} />
        </div>
        {logViewer}
        <h2>Jobs</h2>
        <Table striped>
          <TableHeader>
            <TableRow key="header">
              <TableHeaderCell onClick={() => this.sortHeader("id")} key="0">
                ID
                <div className="sync_status_sort">
                  {this.renderSortButton(this.state.id_sort)}
                </div>
              </TableHeaderCell>
              <TableHeaderCell
                onClick={() => this.sortHeader("function_name")}
                key="1"
              >
                Function name
                <div className="hostname_sort">
                  {this.renderSortButton(this.state.function_name_sort)}
                </div>
              </TableHeaderCell>
              <TableHeaderCell
                onClick={() => this.sortHeader("status")}
                key="2"
              >
                Status
                <div className="device_type_sort">
                  {this.renderSortButton(this.state.status_sort)}
                </div>
              </TableHeaderCell>
              <TableHeaderCell
                onClick={() => this.sortHeader("scheduled_by")}
                key="3"
              >
                Scheduled by
                <div className="sync_status_sort">
                  {this.renderSortButton(this.state.scheduled_by_sort)}
                </div>
              </TableHeaderCell>
              <TableHeaderCell
                onClick={() => this.sortHeader("finish_time")}
                key="4"
              >
                Finish time
                <div className="sync_status_sort">
                  {this.renderSortButton(this.state.finish_time_sort)}
                </div>
              </TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>{jobTableBody}</TableBody>
        </Table>
        <Pagination
          defaultActivePage={1}
          totalPages={this.state.totalPages}
          onPageChange={this.pageChange.bind(this)}
        />
      </section>
    );
  }
}

export default JobList;
