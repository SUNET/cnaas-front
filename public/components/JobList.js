import React from "react";
import { Button, Select, Input, Icon, Pagination, TableBody } from "semantic-ui-react";
import checkResponseStatus from "../utils/checkResponseStatus";
import JobSearchForm from "./JobSearchForm";
import VerifyDiffResult from "./ConfigChange/VerifyDiff/VerifyDiffResult";
import formatISODate from "../utils/formatters";
import Prism from "prismjs";
import { getData } from '../utils/getData'
const io = require("socket.io-client");
var socket = null;

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
    error: null
  };

  getJobsData = options => {
    if (options === undefined) options = {};
    let newState = this.state;
    if (options.sortField !== undefined) {
      newState["sortField"] = options.sortField;
    }
    if (
      options.filterField !== undefined &&
      options.filterValue !== undefined
    ) {
      newState["filterField"] = options.filterField;
      newState["filterValue"] = options.filterValue;
    }
    if (options.pageNum !== undefined) {
      newState["activePage"] = options.pageNum;
    }
    this.setState(newState);
    return this.getJobsAPIData(
      newState["sortField"],
      newState["filterField"],
      newState["filterValue"],
      newState["activePage"]
    );
  };

  /**
   * Handle sorting on different columns when clicking the header fields
   */
  sortHeader = header => {
    let newState = this.state;
    let sortField = "-id";
    const oldValue = this.state[header + "_sort"];
    newState["function_name_sort"] = "";
    newState["status_sort"] = "";
    newState["scheduled_by_sort"] = "";
    newState["finish_time_sort"] = "";
    newState["id_sort"] = "";
    if (oldValue == "" || oldValue == "↑") {
      newState[header + "_sort"] = "↓";
      sortField = header;
    } else if (oldValue == "↓") {
      newState[header + "_sort"] = "↑";
      sortField = "-" + header;
    }
    this.setState(newState);
    this.getJobsData({ sortField: sortField });
    // Close all expanded table rows when resorting the table
    var deviceDetails = document.getElementsByClassName("device_details_row");
    for (var i = 0; i < deviceDetails.length; i++) {
      deviceDetails[i].hidden = true;
    }
  };

  componentDidMount() {
    const credentials = localStorage.getItem("token");
    if (credentials === null) {
      throw("no API token found");
    }
    this.getJobsData();
    socket = io(process.env.API_URL, {query: {jwt: credentials}});
    socket.on('connect', (data) => {
      console.log('Websocket connected!');
      var newLogLines = [];
      var ret = socket.emit('events', {'update': 'job'});
      if (ret !== undefined && ret.connected) {
        newLogLines.push("Listening to job update events\n");
      }
      var ret = socket.emit('events', {'loglevel': 'DEBUG'});
      if (ret !== undefined && ret.connected) {
        newLogLines.push("Listening to log message events\n");
      }
      this.setState({logLines: newLogLines});
    });
    socket.on('events', (data) => {
      // job update event
      if (data.job_id !== undefined) {
        var newLogLines = this.state.logLines;
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        if (data.status === "EXCEPTION") {
          newLogLines.push("job #"+data.job_id+" changed status to "+data.status+": "+data.exception+"\n");
        } else {
          newLogLines.push("job #"+data.job_id+" changed status to "+data.status+"\n");
        }
        this.setState({logLines: newLogLines});
        this.getJobsData();
      } else if (typeof data === 'string' || data instanceof String) {
        var newLogLines = this.state.logLines;
        if (newLogLines.length >= 1000) {
          newLogLines.shift();
        }
        if (this.checkJobLog(data)) {
          newLogLines.push(data + "\n");
          this.setState({logLines: newLogLines});
        }
      }
    });
  };

  componentWillUnmount() {
    if (socket !== null) {
      socket.off('events');
    }
  }

  readHeaders = response => {
    const totalCountHeader = response.headers.get("X-Total-Count");
    if (totalCountHeader !== null && !isNaN(totalCountHeader)) {
      console.log("total: " + totalCountHeader);
      const totalPages = Math.ceil(totalCountHeader / 20);
      this.setState({ totalPages: totalPages });
    } else {
      console.log("Could not find X-Total-Count header, only showing one page");
    }
    return response;
  };

  getJobsAPIData = (sortField = "id", filterField, filterValue, pageNum) => {
    const credentials = localStorage.getItem("token");
    this.setState({loading: true, error: null});
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
      filterParams =
        "&filter[" +
        filterField +
        "]" +
        filterFieldOperator +
        "=" +
        filterValue;
    }
    getData(process.env.API_URL +
      "/api/v1.0/jobs?sort=" +
      sortField +
      filterParams +
      "&page=" +
      pageNum +
      "&per_page=20", credentials)
      .then(data => {
        console.log("this should be data", data);
        {
          this.setState(
            {
              jobsData: data.data.jobs,
              loading: false
            },
            () => {
              console.log("this is new state", this.state.devicesData);
            }
          );
        }
      })
      .catch((error) => {
        this.setState({
          jobsData: [],
          loading: false,
          error: error
        })
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
        Prism.highlightAllUnder(e.target.closest("tr").nextElementSibling, true);
        e.target.closest("tr").firstElementChild.firstElementChild.className = "angle down icon";
      } catch(error) {
        console.log("Could not highlight or change icon for expanded row")
      }
    } else {
      e.target.closest("tr").nextElementSibling.hidden = true;
      try {
        e.target.closest("tr").firstElementChild.firstElementChild.className = "angle right icon";
      } catch(error) {
        console.log("Could not change icon for collapsed row")
      }
    }
  }

  pageChange(e, data) {
    // Update active page and then reload data
    this.setState({ activePage: data.activePage }, () =>
      this.getJobsData({ numPage: data.activePage })
    );
    var tablerows = document.getElementsByClassName("device_details_row");
    var i;
    for (i = 0; i < tablerows.length; i++) {
      tablerows[i].hidden = true;
      try {
        tablerows[i].previousElementSibling.firstElementChild.firstElementChild.className = "angle right icon";
      } catch(error) {
        console.log("Could not change icon for collapsed row")
      }
    } 
  }

  checkJobId(job_id) {
    return function(logLine) {
      return logLine.toLowerCase().includes("job #"+job_id);
    }
  };

  renderSortButton(sort) {
    if (sort === "↑") {
      return <Icon name="sort up" />;
    } else if (sort === "↓") {
      return <Icon name="sort down" />;
    } else {
      return <Icon name="sort" />;
    }
  }

  showException(id) {
    console.log("unhide: ", id);
    var element = document.getElementById("exception_traceback_"+id);
    if (element !== undefined) {
      element.hidden = false;
    }
  }

  checkJobLog(logLine) {
    return logLine.toLowerCase().includes("job #");
  };

  componentDidUpdate() {
    var element = document.getElementById("logoutputdiv");
    if (element !== null) {
      element.scrollTop = element.scrollHeight;
    }
  }

  renderJobDetails(job, index) {
    if (job.status === "EXCEPTION") {
      if (job.exception !== undefined && job.exception !== null) {
        return [
          <p key={"exch_"+index}>Exception message: {job.exception.message}</p>,
          <p key={"excth_"+index}><a href="#" onClick={() => this.showException(index)}>Show exception traceback</a></p>,
          <pre key={"exct_"+index} id={"exception_traceback_"+index} hidden>{job.exception.traceback}</pre>
        ];
      } else {
        return [
          <p key={index}>Empty exception</p>
        ]
      }
    } else if (job.status === "FINISHED") {
      if (typeof job.function_name === 'string' && job.function_name.startsWith("sync_devices")) {
        let devicesObj = job.result.devices;
        const deviceNames = Object.keys(devicesObj);
        const deviceData = Object.values(devicesObj);
        return [
          <p key="diffres_header">Diff results: </p>,
          <VerifyDiffResult
            key="diffres"
            deviceNames={deviceNames}
            deviceData={deviceData}
          />
        ];
      } else if (job.function_name === "init_access_device_step1") {
        let deviceResult = Object.values(job.result.devices);
        let results = deviceResult[0].job_tasks.map(task => {
          if (task.task_name === "napalm_get") {
            if (task.failed === true) {
              return "Device changed management IP";
            } else {
              return "Error: Device kept old management IP";
            }
          } else if (task.task_name === "Generate initial device config") {
            if (task.failed === true) {
              return "Error: Failed to generate config";
            } else {
              return "Config generated successfully";
            }
          }
        }).filter(result => {
          if (result !== undefined) {
            return result;
          }
        });
        return results.map((result, index) => {
          return <p key={index}>{result}</p>;
        });
      } else {
        return [
          <pre key={index}>{JSON.stringify(job.result, null, 2)}</pre>
        ];
      }
    } else {
      return [
        <pre key={index}>{JSON.stringify(job.result, null, 2)}</pre>
      ];
    }
  }

  render() {
    const jobsData = this.state.jobsData;
    let jobTableBody = jobsData.map((job, index) => {
      let jobDetails = this.renderJobDetails(job, index);
      let finishedDevices = "";
      if (job.finished_devices !== null) {
        finishedDevices = job.finished_devices.join(", ");
      }
      let startArgs = null;
      if ('start_arguments' in job && job.start_arguments) {
        startArgs =  
          <tr key="4">
            <td>Start arguments</td>
            <td>{JSON.stringify(job.start_arguments, null, 0)}</td>
          </tr>;
      }

      return [
        <tr key={"job_header_"+job.id} onClick={this.clickRow.bind(this)}>
          <td key="0">
            <Icon name="angle right"/>
            {job.id}
          </td>
          <td key="1">{job.function_name}</td>
          <td key="2">{job.status}</td>
          <td key="3">{job.scheduled_by}</td>
          <td key="4">{formatISODate(job.finish_time)}</td>
        </tr>,
        <tr
          key={"job_content_"+job.id}
          colSpan="5"
          className="device_details_row"
          hidden
        >
          <td>
            <table className="device_details_table">
              <tbody>
                <tr key="0">
                  <td>Start time</td>
                  <td>{formatISODate(job.start_time)}</td>
                </tr>
                <tr key="1">
                  <td>Finish time</td>
                  <td>{formatISODate(job.finish_time)}</td>
                </tr>
                <tr key="2">
                  <td>Comment</td>
                  <td>{job.comment}</td>
                </tr>
                <tr key="3">
                  <td>Ticket reference</td>
                  <td>{job.ticket_ref}</td>
                </tr>
                {startArgs}
                <tr key="5">
                  <td>Next job id</td>
                  <td>{job.next_job_id}</td>
                </tr>
                <tr key="6">
                  <td>Change score</td>
                  <td>{job.change_score}</td>
                </tr>
                <tr key="7">
                  <td>Finished devices</td>
                  <td>{finishedDevices}</td>
                </tr>
              </tbody>
            </table>
            {jobDetails}
          </td>
        </tr>
      ];
    });
    if (this.state.error) {
      jobTableBody = [<tr key="error"><td colSpan="5">API error: {this.state.error.message}</td></tr>];
    } else if (!Array.isArray(jobTableBody) || !jobTableBody.length) {
      if (this.state.loading) {
        jobTableBody = [<tr key="loading"><td colSpan="5"><Icon name="spinner" loading={true} />Loading jobs...</td></tr>];
      } else {
        jobTableBody = [<tr key="empty"><td colSpan="5">Empty result</td></tr>];
      }
    }

    return (
      <section>
        <div id="search">
          <JobSearchForm searchAction={this.getJobsData} />
        </div>
        <div id="logoutputdiv" className="logoutput">
          <pre>
            {this.state.logLines}
          </pre>
        </div>
        <div id="job_list">
          <h2>Job list</h2>
          <div id="data">
            <table className="job_list">
              <thead>
                <tr key="header">
                  <th onClick={() => this.sortHeader("id")} key="0">
                    ID
                    <div className="sync_status_sort">
                      {this.renderSortButton(this.state.id_sort)}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("function_name")} key="1">
                    Function name
                    <div className="hostname_sort">
                      {this.renderSortButton(this.state.function_name_sort)}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("status")} key="2">
                    Status
                    <div className="device_type_sort">
                      {this.renderSortButton(this.state.status_sort)}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("scheduled_by")} key="3">
                    Scheduled by
                    <div className="sync_status_sort">
                      {this.renderSortButton(this.state.scheduled_by_sort)}
                    </div>
                  </th>
                  <th onClick={() => this.sortHeader("finish_time")} key="4">
                    Finish time
                    <div className="sync_status_sort">
                      {this.renderSortButton(this.state.finish_time_sort)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>{jobTableBody}</tbody>
            </table>
          </div>
          <div>
            <Pagination
              defaultActivePage={1}
              totalPages={this.state.totalPages}
              onPageChange={this.pageChange.bind(this)}
            />
          </div>
        </div>
      </section>
    );
  }
}

export default JobList;
