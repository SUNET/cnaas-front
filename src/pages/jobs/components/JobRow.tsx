import type { ReactNode } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Collapse from "@mui/material/Collapse";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { styled } from "@mui/material/styles";
import { formatISODate } from "../../../utils/formatters";
import { JobDetails } from "./JobDetails";
import type { Job } from "../../../types/job";

const DetailLayout = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "var(--size-md)",
  padding: "var(--size-sm) 0",
});

type JobRowProps = {
  readonly job: Job;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
};

/**
 * Renders a single job row in the jobs table, including the expandable details section.
 */
export function JobRow({ job, isExpanded, onToggle }: JobRowProps) {
  const finishedDevices = job.finished_devices?.join(", ") ?? "";

  return (
    <>
      <TableRow
        onClick={onToggle}
        sx={{
          cursor: "pointer",
          "& > .MuiTableCell-root": { borderBottom: "unset" },
          "&:hover": { backgroundColor: "var(--color-surface)" },
        }}
      >
        <TableCell>
          {isExpanded ? (
            <KeyboardArrowDownIcon
              fontSize="small"
              sx={{ verticalAlign: "middle" }}
            />
          ) : (
            <KeyboardArrowRightIcon
              fontSize="small"
              sx={{ verticalAlign: "middle" }}
            />
          )}
          {job.id}
        </TableCell>
        <TableCell>{job.function_name}</TableCell>
        <TableCell>{job.status}</TableCell>
        <TableCell>{job.scheduled_by}</TableCell>
        <TableCell>{formatISODate(job.finish_time)}</TableCell>
      </TableRow>
      <TableRow className="device_details_row">
        <TableCell colSpan={5} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <DetailLayout>
              <JobMetadataTable job={job} finishedDevices={finishedDevices} />
              <div style={{ gridColumn: "1 / -1" }}>
                <JobDetails job={job} />
              </div>
            </DetailLayout>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

type JobMetadataTableProps = {
  readonly job: Job;
  readonly finishedDevices: string;
};

function JobMetadataTable({
  job,
  finishedDevices,
}: JobMetadataTableProps): ReactNode {
  const rows: ReadonlyArray<{ label: string; value: ReactNode }> = [
    { label: "Start time", value: formatISODate(job.start_time) },
    { label: "Finish time", value: formatISODate(job.finish_time) },
    { label: "Comment", value: job.comment },
    { label: "Ticket reference", value: job.ticket_ref },
    ...(job.start_arguments
      ? [
          {
            label: "Start arguments",
            value: JSON.stringify(job.start_arguments, null, 0),
          },
        ]
      : []),
    { label: "Next job id", value: job.next_job_id },
    { label: "Change score", value: job.change_score },
    { label: "Finished devices", value: finishedDevices },
  ];

  return (
    <Table
      size="small"
      sx={{
        "& td": { border: 0, fontSize: "var(--size-md)" },
        "& tbody tr:nth-of-type(even)": {
          backgroundColor: "var(--color-surface)",
        },
      }}
    >
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell
              sx={{
                fontWeight: 700,
                width: "1%",
                whiteSpace: "nowrap",
                verticalAlign: "top",
              }}
            >
              {row.label}
            </TableCell>
            <TableCell>{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
