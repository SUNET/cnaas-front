import { type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import IconButton from "@mui/material/IconButton";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Tooltip } from "../../../components/Tooltip";
import YAML from "yaml";

type CommitModalAccessProps = {
  readonly accordionActiveIndex: number;
  readonly onAccordionChange: (index: number) => void;
  readonly autoPushJobsHTML: ReactNode[];
  readonly errorMessage: string | null;
  readonly interfaceDataUpdatedJSON: Record<string, unknown>;
};

export function CommitModalAccess({
  accordionActiveIndex,
  onAccordionChange,
  autoPushJobsHTML,
  errorMessage,
  interfaceDataUpdatedJSON,
}: CommitModalAccessProps) {
  return (
    <DialogContent>
      <DialogContentText
        id="interface-save-commit-dialog-description"
        component="div"
      >
        <Accordion
          expanded={accordionActiveIndex === 1}
          onChange={() => onAccordionChange(1)}
        >
          <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
            POST JSON:
          </AccordionSummary>
          <AccordionDetails>
            <pre>{JSON.stringify(interfaceDataUpdatedJSON, null, 2)}</pre>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={accordionActiveIndex === 2}
          onChange={() => onAccordionChange(2)}
        >
          <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
            POST error:
          </AccordionSummary>
          <AccordionDetails>
            <p>{errorMessage}</p>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={accordionActiveIndex === 3}
          onChange={() => onAccordionChange(3)}
        >
          <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
            Job output:
          </AccordionSummary>
          <AccordionDetails>
            <ul>{autoPushJobsHTML}</ul>
          </AccordionDetails>
        </Accordion>
      </DialogContentText>
    </DialogContent>
  );
}

export function CommitModalDist({
  hostname,
  ifDataYaml,
}: {
  readonly hostname: string | null;
  readonly ifDataYaml: Record<string, unknown>;
}) {
  const settingsWebUrl = process.env.SETTINGS_WEB_URL;
  const editUrl = settingsWebUrl
    ? settingsWebUrl.split("/").slice(0, 5).join("/")
    : null;
  const yaml = YAML.stringify(ifDataYaml, { indent: 2 });

  return (
    <DialogContent>
      <DialogContentText
        id="interface-save-commit-dialog-description"
        component="div"
      >
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
            YAML:
          </AccordionSummary>
          <AccordionDetails>
            <pre>{yaml}</pre>
            <Tooltip title="Copy YAML" placement="bottom-end">
              <IconButton
                size="small"
                aria-label="Copy YAML"
                onClick={() =>
                  navigator.clipboard.writeText(
                    yaml.split("\n").slice(1).join("\n"),
                  )
                }
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <p>
              {editUrl ? (
                <>
                  <a
                    href={`${editUrl}/_edit/main/devices/${hostname}/interfaces.yml`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edit in Git
                  </a>{" "}
                  (edit and commit the file in git before starting dry run)
                </>
              ) : null}
            </p>
          </AccordionDetails>
        </Accordion>
      </DialogContentText>
    </DialogContent>
  );
}
