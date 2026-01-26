import PropTypes from "prop-types";
import {
  Grid,
  GridColumn,
  Icon,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "semantic-ui-react";
import { formatISODate } from "../../utils/formatters";
import { JobDetails } from "./JobDetails";

JobRow.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.number.isRequired,
    function_name: PropTypes.string,
    status: PropTypes.string.isRequired,
    scheduled_by: PropTypes.string,
    start_time: PropTypes.string,
    finish_time: PropTypes.string,
    comment: PropTypes.string,
    ticket_ref: PropTypes.string,
    start_arguments: PropTypes.object,
    next_job_id: PropTypes.number,
    change_score: PropTypes.number,
    finished_devices: PropTypes.arrayOf(PropTypes.string),
    result: PropTypes.object,
    exception: PropTypes.object,
  }).isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

/**
 * Renders a single job row in the jobs table, including the expandable details section.
 */
export function JobRow({ job, isExpanded, onToggle }) {
  const finishedDevices = job.finished_devices?.join(", ") ?? "";

  return (
    <>
      <TableRow onClick={onToggle}>
        <TableCell>
          <Icon name={isExpanded ? "angle down" : "angle right"} />
          {job.id}
        </TableCell>
        <TableCell>{job.function_name}</TableCell>
        <TableCell>{job.status}</TableCell>
        <TableCell>{job.scheduled_by}</TableCell>
        <TableCell>{formatISODate(job.finish_time)}</TableCell>
      </TableRow>
      <TableRow className="device_details_row" hidden={!isExpanded}>
        <TableCell style={{ display: "block" }}>
          <Grid columns={2}>
            <GridColumn>
              <JobMetadataTable job={job} finishedDevices={finishedDevices} />
            </GridColumn>
            <GridColumn width={16}>
              <JobDetails job={job} />
            </GridColumn>
          </Grid>
        </TableCell>
      </TableRow>
    </>
  );
}

JobMetadataTable.propTypes = {
  job: PropTypes.shape({
    start_time: PropTypes.string,
    finish_time: PropTypes.string,
    comment: PropTypes.string,
    ticket_ref: PropTypes.string,
    start_arguments: PropTypes.object,
    next_job_id: PropTypes.number,
    change_score: PropTypes.number,
  }).isRequired,
  finishedDevices: PropTypes.string.isRequired,
};

function JobMetadataTable({ job, finishedDevices }) {
  return (
    <Table compact basic="very">
      <TableBody>
        <TableRow>
          <TableCell>Start time</TableCell>
          <TableCell>{formatISODate(job.start_time)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Finish time</TableCell>
          <TableCell>{formatISODate(job.finish_time)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Comment</TableCell>
          <TableCell>{job.comment}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Ticket reference</TableCell>
          <TableCell>{job.ticket_ref}</TableCell>
        </TableRow>
        {job.start_arguments && (
          <TableRow>
            <TableCell>Start arguments</TableCell>
            <TableCell>
              {JSON.stringify(job.start_arguments, null, 0)}
            </TableCell>
          </TableRow>
        )}
        <TableRow>
          <TableCell>Next job id</TableCell>
          <TableCell>{job.next_job_id}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Change score</TableCell>
          <TableCell>{job.change_score}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Finished devices</TableCell>
          <TableCell>{finishedDevices}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
