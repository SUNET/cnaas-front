import PropTypes from "prop-types";
import { Accordion, Button, Icon, Modal, Popup } from "semantic-ui-react";
import YAML from "yaml";

CommitModalAccess.propTypes = {
  accordionActiveIndex: PropTypes.number,
  accordionClick: PropTypes.func,
  autoPushJobsHTML: PropTypes.array,
  errorMessage: PropTypes.string,
  interfaceDataUpdatedJSON: PropTypes.object,
};

export function CommitModalAccess({
  accordionActiveIndex,
  accordionClick,
  autoPushJobsHTML,
  errorMessage,
  interfaceDataUpdatedJSON,
}) {
  return (
    <Modal.Content>
      <Modal.Description>
        <Accordion>
          <Accordion.Title
            active={accordionActiveIndex === 1}
            index={1}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            POST JSON:
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 1}>
            <pre>{JSON.stringify(interfaceDataUpdatedJSON, null, 2)}</pre>
          </Accordion.Content>
          <Accordion.Title
            active={accordionActiveIndex === 2}
            index={2}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            POST error:
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 2}>
            <p>{errorMessage}</p>
          </Accordion.Content>
          <Accordion.Title
            active={accordionActiveIndex === 3}
            index={3}
            onClick={accordionClick}
          >
            <Icon name="dropdown" />
            Job output:
          </Accordion.Title>
          <Accordion.Content active={accordionActiveIndex === 3}>
            <ul>{autoPushJobsHTML}</ul>
          </Accordion.Content>
        </Accordion>
      </Modal.Description>
    </Modal.Content>
  );
}

CommitModalDist.propTypes = {
  hostname: PropTypes.string,
  ifDataYaml: PropTypes.object,
};

export function CommitModalDist({ hostname, ifDataYaml }) {
  const editUrl = process.env.SETTINGS_WEB_URL.split("/").slice(0, 5).join("/");
  const yaml = YAML.stringify(ifDataYaml, null, 2);

  return (
    <Modal.Content>
      <Modal.Description>
        <Accordion>
          <Accordion.Title active index={1}>
            <Icon name="dropdown" />
            YAML:
          </Accordion.Title>
          <Accordion.Content active>
            <pre>{yaml}</pre>
            <Popup
              content="Copy YAML"
              trigger={
                <Button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      yaml.split("\n").slice(1).join("\n"),
                    )
                  }
                  icon="copy"
                  size="tiny"
                />
              }
              position="bottom right"
            />
            <p>
              <a
                href={`${editUrl}/_edit/main/devices/${hostname}/interfaces.yml`}
                target="_blank"
                rel="noreferrer"
              >
                Edit in Git
              </a>{" "}
              (edit and commit the file in git before starting dry run)
            </p>
          </Accordion.Content>
        </Accordion>
      </Modal.Description>
    </Modal.Content>
  );
}
