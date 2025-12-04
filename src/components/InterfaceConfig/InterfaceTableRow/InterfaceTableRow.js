import _ from "lodash";
import {
  Input,
  Dropdown,
  Icon,
  Table,
  Loader,
  Button,
  ButtonGroup,
  Popup,
  Checkbox,
  TextArea,
} from "semantic-ui-react";
import { InterfaceCurrentConfig } from "./InterfaceCurrentConfig";
import { NetboxInterfacePopup } from "./NetboxInterfacePopup";
import { LldpNeighborPopup } from "./LldpNeighborPopup";
import { InterfaceStatusUp } from "./InterfaceStatusUp";
import { InterfaceStatusAdminDisabled } from "./InterfaceStatusAdminDisabled";
import { InterfaceStatusDown } from "./InterfaceStatusDown";
import { BounceInterfaceButton } from "./BounceInterfaceButton";
import { PortTypeCellAccess } from "./PortTypeCellAccess";
import { PortTypeCellDist } from "./PortTypeCellDist";
import PropTypes from "prop-types";

const CONFIG_TYPES_ENABLED = [
  "ACCESS_AUTO",
  "ACCESS_UNTAGGED",
  "ACCESS_TAGGED",
  "ACCESS_DOWNLINK",
];

const IF_CLASSES_ENABLED = ["custom", "downlink"];

function mapVlanToName(vlan, vlanOptions) {
  if (typeof vlan === "number") {
    const mapped = vlanOptions.find((opt) => opt.description === vlan);
    return mapped ? mapped.value : vlan;
  }
  return vlan;
}

InterfaceTableRow.propTypes = {
  addPortTemplateOption: PropTypes.func,
  addTagOption: PropTypes.func,
  deviceSettings: PropTypes.object,
  deviceType: PropTypes.string,
  displayColumns: PropTypes.array,
  hostname: PropTypes.string,
  index: PropTypes.number,
  interfaceBounceRunning: PropTypes.object,
  interfaceDataUpdated: PropTypes.object,
  interfaceStatusData: PropTypes.object,
  interfaceToggleUntagged: PropTypes.object,
  item: PropTypes.object,
  lldpNeighborData: PropTypes.object,
  netboxInterfaceData: PropTypes.array,
  portTemplateOptions: PropTypes.array,
  submitBounce: PropTypes.func,
  tagOptions: PropTypes.array,
  untaggedClick: PropTypes.func,
  untaggedVlanOptions: PropTypes.array,
  updateFieldData: PropTypes.func,
  vlanOptions: PropTypes.array,
};

export function InterfaceTableRow({
  addPortTemplateOption,
  addTagOption,
  deviceSettings,
  deviceType,
  displayColumns,
  hostname,
  index,
  interfaceBounceRunning,
  interfaceDataUpdated,
  interfaceStatusData,
  interfaceToggleUntagged,
  item,
  lldpNeighborData,
  netboxInterfaceData,
  portTemplateOptions,
  submitBounce,
  tagOptions,
  untaggedClick,
  untaggedVlanOptions,
  updateFieldData,
  vlanOptions,
}) {
  const ifDataUpdated =
    item.name in interfaceDataUpdated ? interfaceDataUpdated[item.name] : null;
  const updated = item.name in interfaceDataUpdated;

  // Determine if editing is disabled
  let editDisabled = true;
  if (deviceType === "ACCESS") {
    editDisabled = !CONFIG_TYPES_ENABLED.includes(item.configtype);
  } else if (deviceType === "DIST") {
    if (item.ifclass?.startsWith("port_template")) {
      editDisabled = false;
    } else {
      editDisabled = !IF_CLASSES_ENABLED.includes(item.ifclass);
    }
  }

  // Initialize fields based on device type
  const initFields = () => {
    if (deviceType === "ACCESS") {
      return {
        description: "",
        untagged_vlan: null,
        tagged_vlan_list: null,
        tags: [],
        enabled: true,
        aggregate_id: null,
        bpdu_filter: false,
        redundant_link: true,
      };
    } else if (deviceType === "DIST") {
      return {
        description: "",
        untagged_vlan: null,
        tagged_vlan_list: [],
        tags: [],
        enabled: true,
        config: "",
      };
    }
    return {};
  };

  const fields = initFields();

  // Populate ifData
  let ifData = item.data;
  if (deviceType === "DIST") {
    ifData = {};
    Object.entries(fields).forEach(([key, value]) => {
      ifData[key] = item[key] ?? value;
    });
    if (item.peer_hostname) {
      ifData.description = item.peer_hostname;
    }
  }

  // Populate fields from ifData
  if (ifData) {
    if (ifData.description) {
      fields.description = ifData.description;
    } else if (ifData.neighbor) {
      fields.description = `Uplink to ${ifData.neighbor}`;
    } else if (ifData.neighbor_id) {
      fields.description = "MLAG peer link";
    }

    [
      "aggregate_id",
      "bpdu_filter",
      "enabled",
      "redundant_link",
      "tags",
    ].forEach((fieldName) => {
      if (fieldName in ifData) {
        fields[fieldName] = ifData[fieldName];
      }
    });

    if (ifDataUpdated?.untagged_vlan !== undefined) {
      fields.untagged_vlan = ifDataUpdated.untagged_vlan;
    } else if (ifData.untagged_vlan !== undefined) {
      fields.untagged_vlan = mapVlanToName(ifData.untagged_vlan, vlanOptions);
    }

    if (ifDataUpdated?.tagged_vlan_list !== undefined) {
      fields.tagged_vlan_list = ifDataUpdated.tagged_vlan_list;
    } else if (ifData.tagged_vlan_list) {
      fields.tagged_vlan_list = ifData.tagged_vlan_list.map((vlan_item) => {
        return mapVlanToName(vlan_item, vlanOptions);
      });
    }
  } else if (ifDataUpdated) {
    [
      "aggregate_id",
      "bpdu_filter",
      "enabled",
      "redundant_link",
      "tagged_vlan_list",
      "tags",
      "untagged_vlan",
    ].forEach((fieldName) => {
      if (fieldName in ifDataUpdated) {
        fields[fieldName] = ifDataUpdated[fieldName];
      }
    });
  }

  // Determine current config type and display settings
  let currentConfigtype = null;
  let currentIfClass = null;
  let displayVlan = false;
  let displayVlanTagged = false;
  let displayTaggedToggle = false;
  let portTemplate = null;
  let currentEnabled = fields.enabled;

  if (deviceType === "ACCESS") {
    currentConfigtype = ifDataUpdated?.configtype ?? item.configtype;

    if (currentConfigtype === "ACCESS_TAGGED") {
      displayVlanTagged = true;
      displayTaggedToggle = true;
    }
    if (["ACCESS_TAGGED", "ACCESS_UNTAGGED"].includes(currentConfigtype)) {
      displayVlan = true;
    }
    if (item.name in interfaceToggleUntagged) {
      displayVlanTagged = !displayVlanTagged;
    }
    if (ifDataUpdated?.enabled !== undefined) {
      currentEnabled = ifDataUpdated.enabled;
    }
  } else if (deviceType === "DIST") {
    currentIfClass = item.ifclass?.startsWith("port_template")
      ? "port_template"
      : item.ifclass;

    if (ifDataUpdated?.ifclass) {
      currentIfClass = ifDataUpdated.ifclass;
    }

    if (currentIfClass?.startsWith("port_template")) {
      portTemplate =
        ifDataUpdated?.port_template ??
        item.ifclass?.substring("port_template_".length);

      const dropDownEntry = portTemplateOptions.find(
        (obj) => obj.text === portTemplate,
      );

      if (dropDownEntry?.vlan_config === "untagged") {
        displayVlan = true;
        displayVlanTagged = false;
      } else if (dropDownEntry?.vlan_config === "tagged") {
        displayVlan = true;
        displayVlanTagged = true;
        displayTaggedToggle = true;
      } else {
        displayVlan = true;
        displayVlanTagged = true;
        displayTaggedToggle = true;
      }
    } else {
      displayVlanTagged = false;
    }

    if (item.name in interfaceToggleUntagged) {
      displayVlanTagged = !displayVlanTagged;
    }
    if (ifDataUpdated?.enabled !== undefined) {
      currentEnabled = ifDataUpdated.enabled;
    }
  }

  // Render optional columns
  const optionalColumns = displayColumns.map((columnName) => {
    let colData = [];

    if (columnName === "vlans") {
      if (!deviceSettings) {
        colData = [<Loader key="loading" inline active />];
      } else if (vlanOptions.length === 0) {
        colData = [<p key="no-vlans">No VLANs available</p>];
      } else if (displayVlan) {
        if (displayVlanTagged) {
          colData = [
            <Dropdown
              key={`tagged_vlan_list|${item.name}`}
              name={`tagged_vlan_list|${item.name}`}
              fluid
              multiple
              selection
              search={(filteredOptions, searchQuery) => {
                const re = new RegExp(_.escapeRegExp(searchQuery), "i");
                return _.filter(
                  filteredOptions,
                  (opt) =>
                    re.test(opt.text) || re.test(opt.description?.toString()),
                );
              }}
              options={vlanOptions}
              defaultValue={fields.tagged_vlan_list}
              onChange={updateFieldData}
            />,
          ];
        } else {
          colData = [
            <Dropdown
              key={`untagged_vlan|${item.name}`}
              name={`untagged_vlan|${item.name}`}
              fluid
              selection
              search={(filteredOptions, searchQuery) => {
                const re = new RegExp(_.escapeRegExp(searchQuery), "i");
                return _.filter(
                  filteredOptions,
                  (opt) =>
                    re.test(opt.text) || re.test(opt.description?.toString()),
                );
              }}
              options={untaggedVlanOptions}
              defaultValue={fields.untagged_vlan}
              onChange={updateFieldData}
            />,
          ];
        }

        if (displayTaggedToggle) {
          colData.push(
            <ButtonGroup key="toggle_tagged" size="mini" vertical>
              <Popup
                key="untagged_popup"
                content="Change untagged VLAN"
                position="top right"
                trigger={
                  <Button
                    id={item.name}
                    name="untagged"
                    onClick={untaggedClick}
                    active={item.name in interfaceToggleUntagged}
                    className="table-button-compact"
                  >
                    U
                  </Button>
                }
              />
              <Popup
                key="tagged_popup"
                content="Change list of tagged VLANs"
                position="bottom right"
                trigger={
                  <Button
                    id={item.name}
                    name="tagged"
                    onClick={untaggedClick}
                    active={!(item.name in interfaceToggleUntagged)}
                    className="table-button-compact"
                  >
                    T
                  </Button>
                }
              />
            </ButtonGroup>,
          );
        }
      }
    } else if (columnName === "tags") {
      colData = [
        <Dropdown
          key={`tags|${item.name}`}
          name={`tags|${item.name}`}
          fluid
          multiple
          selection
          search
          allowAdditions
          options={tagOptions}
          defaultValue={fields.tags}
          onAddItem={addTagOption}
          onChange={updateFieldData}
          disabled={editDisabled}
        />,
      ];
    } else if (columnName === "json") {
      if (item.data) {
        colData = [
          <Popup
            key="rawjson"
            header="Raw JSON data"
            content={JSON.stringify(item.data)}
            position="top right"
            wide
            hoverable
            trigger={<Icon color="grey" name="ellipsis horizontal" />}
          />,
        ];
      }
    } else if (columnName === "aggregate_id") {
      colData = [
        <Input
          key={`aggregate_id|${item.name}`}
          name={`aggregate_id|${item.name}`}
          defaultValue={fields.aggregate_id}
          disabled={editDisabled}
          onChange={updateFieldData}
        />,
      ];
    } else if (columnName === "bpdu_filter") {
      colData = [
        <Popup
          key="bpdu_filter"
          header="Enable spanning-tree BPDU filter on this interface"
          wide
          hoverable
          trigger={
            <Checkbox
              key={`bpdu_filter|${item.name}`}
              name={`bpdu_filter|${item.name}`}
              defaultChecked={fields.bpdu_filter}
              onChange={updateFieldData}
              disabled={editDisabled}
            />
          }
        />,
      ];
    } else if (columnName === "config") {
      colData = [
        <TextArea
          key={`config|${item.name}`}
          name={`config|${item.name}`}
          defaultValue={item.config}
          rows={3}
          cols={50}
          hidden={currentIfClass !== "custom"}
          onChange={updateFieldData}
        />,
        <Popup
          key="config_popup"
          on="click"
          pinned
          position="top right"
          trigger={
            <Button compact size="small">
              <Icon name="arrow alternate circle down outline" />
            </Button>
          }
        >
          <p key="title">Current running config:</p>
          <InterfaceCurrentConfig hostname={hostname} interface={item.name} />
        </Popup>,
      ];
    }

    return (
      <Table.Cell collapsing key={columnName}>
        {colData}
      </Table.Cell>
    );
  });

  // Render status icon
  let statusIcon = <Icon loading color="grey" name="spinner" />;
  const interfaceStatusDataLower = Object.fromEntries(
    Object.entries(interfaceStatusData).map(([k, v]) => [k.toLowerCase(), v]),
  );

  if (item.name.toLowerCase() in interfaceStatusDataLower) {
    const itemInterfaceStatusData =
      interfaceStatusDataLower[item.name.toLowerCase()];

    const toggleEnabled = (
      <Checkbox
        key={`enabled|${item.name}`}
        name={`enabled|${item.name}`}
        toggle
        label={<label>Enable interface</label>}
        defaultChecked={currentEnabled}
        onChange={updateFieldData}
        disabled={editDisabled}
      />
    );

    let bounceDisabled = false;
    let statusMessage = null;
    if (item.name in interfaceBounceRunning) {
      if (interfaceBounceRunning[item.name] === "running") {
        bounceDisabled = true;
      } else {
        statusMessage = (
          <p key="message">{interfaceBounceRunning[item.name]}</p>
        );
      }
    }

    const bounceInterfaceButton =
      deviceType === "ACCESS" ? (
        <BounceInterfaceButton
          key={`${item.name}_bounce`}
          handleClick={submitBounce}
          editDisabled={editDisabled}
          bounceDisabled={bounceDisabled}
        />
      ) : null;

    if (itemInterfaceStatusData.is_up === true) {
      statusIcon = (
        <InterfaceStatusUp
          bounceInterfaceButton={bounceInterfaceButton}
          hostname={hostname}
          name={item.name}
          speed={itemInterfaceStatusData.speed}
          statusMessage={statusMessage}
          toggleEnabled={toggleEnabled}
        />
      );
    } else if (itemInterfaceStatusData.is_enabled === false) {
      statusIcon = (
        <InterfaceStatusAdminDisabled
          hostname={hostname}
          name={item.name}
          toggleEnabled={toggleEnabled}
        />
      );
    } else {
      statusIcon = (
        <InterfaceStatusDown
          bounceInterfaceButton={bounceInterfaceButton}
          hostname={hostname}
          name={item.name}
          statusMessage={statusMessage}
          toggleEnabled={toggleEnabled}
        />
      );
    }
  }

  // Netbox and LLDP popups
  let netboxInterfacePopup = null;
  if (Array.isArray(netboxInterfaceData) && netboxInterfaceData.length > 0) {
    const currentNetboxInterfaceData = netboxInterfaceData.find(
      (netboxInterface) => netboxInterface.name === item.name,
    );
    if (currentNetboxInterfaceData) {
      netboxInterfacePopup = (
        <NetboxInterfacePopup netboxInterface={currentNetboxInterfaceData} />
      );
    }
  }

  let lldpNeighborPopup = null;
  if (Object.hasOwn(lldpNeighborData, item.name.toLowerCase())) {
    lldpNeighborPopup = (
      <LldpNeighborPopup
        lldpNeighborData={lldpNeighborData[item.name.toLowerCase()]}
      />
    );
  }

  const descriptionDetails = (
    <div>
      <ButtonGroup size="mini" vertical>
        {netboxInterfacePopup}
        {lldpNeighborPopup}
      </ButtonGroup>
    </div>
  );

  return (
    <Table.Row key={`tr_${index}`} warning={updated}>
      <Table.Cell>
        {statusIcon} {item.name}
      </Table.Cell>
      <Table.Cell>
        <Input
          key={`description|${item.name}`}
          name={`description|${item.name}`}
          defaultValue={fields.description}
          disabled={editDisabled}
          onChange={updateFieldData}
        />
        {descriptionDetails}
      </Table.Cell>
      {deviceType === "ACCESS" && (
        <PortTypeCellAccess
          item={item}
          currentConfigtype={currentConfigtype}
          fields={fields}
          editDisabled={editDisabled}
          updateFieldData={updateFieldData}
        />
      )}
      {deviceType === "DIST" && (
        <PortTypeCellDist
          item={item}
          currentIfClass={currentIfClass}
          portTemplate={portTemplate}
          editDisabled={editDisabled}
          portTemplateOptions={portTemplateOptions}
          updateFieldData={updateFieldData}
          addPortTemplateOption={addPortTemplateOption}
        />
      )}
      {optionalColumns}
    </Table.Row>
  );
}
