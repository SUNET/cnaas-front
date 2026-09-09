import type { ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

type TaskProps = {
  /** Rendered as the collapsible header's <h2>. */
  readonly title: ReactNode;
  readonly children: ReactNode;
  /** Whether the task starts open. Defaults to true (most steps start visible). */
  readonly defaultExpanded?: boolean;
};

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
  margin: theme.spacing(2, 0),
  "&:before": {
    // Hide the divider line MUI renders between adjacent accordions; our
    // own border above already delineates each task.
    display: "none",
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
}));

const TaskTitle = styled(Typography)<TypographyProps>(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.primary.main,
}));

/**
 * A single step in a multi-step workflow, rendered as
 * a collapsible card with a titled header.
 */
export function Task({ title, children, defaultExpanded = true }: TaskProps) {
  return (
    <StyledAccordion
      defaultExpanded={defaultExpanded}
      disableGutters
      // MUI's Accordion wraps AccordionSummary in its own <h3> "heading" slot.
      // TaskTitle below is already the real <h2> heading for this section, so
      // demote MUI's wrapper to a plain <div> to avoid nesting two heading
      // roles with the same accessible name.
      slots={{ heading: "div" }}
    >
      <StyledAccordionSummary expandIcon={<ExpandMoreIcon />}>
        <TaskTitle component="h2" variant="h5">
          {title}
        </TaskTitle>
      </StyledAccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </StyledAccordion>
  );
}
