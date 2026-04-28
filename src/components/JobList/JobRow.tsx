import type { ReactNode } from "react";
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
import type { Job } from "../../store/jobList/jobListReducer";

interface JobRowProps {
  readonly job: Job;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

/**
 * Renders a single job row in the jobs table, including the expandable details section.
 */
export function JobRow({ job, isExpanded, onToggle }: JobRowProps) {
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

interface JobMetadataTableProps {
  readonly job: Job;
  readonly finishedDevices: string;
}

function JobMetadataTable({
  job,
  finishedDevices,
}: JobMetadataTableProps): ReactNode {
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
