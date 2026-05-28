import { type SyntheticEvent, type ReactNode } from "react";
import { ButtonGroup, Checkbox, Icon, Input, Table } from "semantic-ui-react";
import { VlanColumn } from "./VlanColumn";
import {
  TagsColumn,
  JsonColumn,
  AggregateIdColumn,
  BpduFilterColumn,
} from "./columns";
import { ConfigColumn } from "./ConfigColumn";
import { NetboxInterfacePopup } from "./NetboxInterfacePopup";
import { LldpNeighborPopup } from "./LldpNeighborPopup";
import type { LldpNeighbor } from "../../types/lldp";
import { LinknetWarningPopup } from "./LinknetWarningPopup";
import { LinknetOkButton } from "./LinknetOkButton";
import { InterfaceStatusUp } from "./InterfaceStatusUp";
import { InterfaceStatusAdminDisabled } from "./InterfaceStatusAdminDisabled";
import { InterfaceStatusDown } from "./InterfaceStatusDown";
import { BounceInterfaceButton } from "./BounceInterfaceButton";
import { PortTypeCellAccess } from "./PortTypeCellAccess";
import { PortTypeCellDist } from "./PortTypeCellDist";
import { useInterfaceConfig } from "../../stores/InterfaceConfigContext";
import type {
  AccessInterfaceItem,
  DistInterfaceItem,
} from "../../api/interfaceConfigApi";
import type { DropdownOption } from "../../stores/interfaceConfigReducer";

const CONFIG_TYPES_ENABLED = new Set([
  "ACCESS_AUTO",
  "ACCESS_UNTAGGED",
  "ACCESS_TAGGED",
  "ACCESS_DOWNLINK",
]);

const IF_CLASSES_ENABLED = new Set(["custom", "downlink"]);

function mapVlanToName(vlan: unknown, vlanOptions: DropdownOption[]): unknown {
  if (typeof vlan === "number") {
    const mapped = vlanOptions.find((opt) => opt.description === vlan);
    return mapped ? mapped.value : vlan;
  }
  return vlan;
}

// --- OptionalColumn dispatcher ---

type OptionalColumnProps = {
  readonly columnName: string;
  readonly interfaceName: string;
  readonly fields: Record<string, unknown>;
  readonly editDisabled: boolean;
  readonly displayVlan: boolean;
  readonly displayVlanTagged: boolean;
  readonly displayTaggedToggle: boolean;
  readonly hostname: string | null;
  readonly config: string | undefined;
  readonly data: Record<string, unknown> | undefined;
  readonly currentIfClass: string | null;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addTagOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly untaggedClick: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

function OptionalColumn({
  columnName,
  interfaceName,
  fields,
  editDisabled,
  displayVlan,
  displayVlanTagged,
  displayTaggedToggle,
  hostname,
  config,
  data,
  currentIfClass,
  updateFieldData,
  addTagOption,
  untaggedClick,
}: OptionalColumnProps) {
  const { state } = useInterfaceConfig();

  switch (columnName) {
    case "vlans":
      return (
        <VlanColumn
          interfaceName={interfaceName}
          displayVlan={displayVlan}
          displayVlanTagged={displayVlanTagged}
          displayTaggedToggle={displayTaggedToggle}
          taggedVlanList={fields.tagged_vlan_list}
          untaggedVlan={fields.untagged_vlan}
          updateFieldData={updateFieldData}
          untaggedClick={untaggedClick}
        />
      );
    case "tags":
      return (
        <TagsColumn
          interfaceName={interfaceName}
          tags={fields.tags as string[]}
          editDisabled={editDisabled}
          tagOptions={state.tags}
          updateFieldData={updateFieldData}
          addTagOption={addTagOption}
        />
      );
    case "json":
      return <JsonColumn data={data} />;
    case "aggregate_id":
      return (
        <AggregateIdColumn
          interfaceName={interfaceName}
          aggregateId={fields.aggregate_id}
          editDisabled={editDisabled}
          updateFieldData={updateFieldData}
        />
      );
    case "bpdu_filter":
      return (
        <BpduFilterColumn
          interfaceName={interfaceName}
          bpduFilter={fields.bpdu_filter as boolean}
          editDisabled={editDisabled}
          updateFieldData={updateFieldData}
        />
      );
    case "config":
      return (
        <ConfigColumn
          interfaceName={interfaceName}
          hostname={hostname}
          config={config}
          currentIfClass={currentIfClass}
          updateFieldData={updateFieldData}
        />
      );
    default:
      return null;
  }
}

// --- Props ---

type InterfaceTableRowProps = {
  readonly item: AccessInterfaceItem | DistInterfaceItem;
  readonly index: number;
  readonly updateFieldData: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addTagOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly addPortTemplateOption: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
  readonly submitBounce: () => void;
  readonly untaggedClick: (
    e: SyntheticEvent,
    data: Record<string, unknown>,
  ) => void;
};

/**
 * A single row in the interface config table.
 *
 * Reads ambient data (settings, field options, status, etc.) from context.
 * Only receives row-specific data as props: `item` and `index`.
 *
 * Also receives callback props that are pre-bound or adapter-shaped
 * from the parent: `updateFieldData`, `addTagOption`, `addPortTemplateOption`,
 * `submitBounce`, `untaggedClick`. These adapt the Semantic UI callback
 * signatures to the context's named actions.
 */
export function InterfaceTableRow({
  item,
  index,
  updateFieldData,
  addTagOption,
  addPortTemplateOption,
  submitBounce,
  untaggedClick,
}: InterfaceTableRowProps) {
  const { state } = useInterfaceConfig();

  const {
    device,
    displayColumns,
    interfaceBounceRunning,
    interfaceDataUpdated,
    interfaceStatus: interfaceStatusData,
    interfaceToggleUntagged,
    lldpNeighbors: lldpNeighborData,
    linknetMismatches,
    linknetCheckedPorts,
    netboxInterfaces: netboxInterfaceData,
    portTemplates: portTemplateOptions,
    vlans: vlanOptions,
  } = state;

  const hostname = device?.hostname ?? null;
  const deviceType = device?.device_type;

  // Narrow item type based on device type
  const accessItem =
    deviceType === "ACCESS" ? (item as AccessInterfaceItem) : null;
  const distItem = deviceType === "DIST" ? (item as DistInterfaceItem) : null;

  const ifDataUpdated =
    item.name in interfaceDataUpdated ? interfaceDataUpdated[item.name] : null;
  const updated = item.name in interfaceDataUpdated;

  // Determine if editing is disabled
  let editDisabled = true;
  if (deviceType === "ACCESS") {
    editDisabled = !CONFIG_TYPES_ENABLED.has(accessItem!.configtype ?? "");
  } else if (deviceType === "DIST") {
    if (distItem!.ifclass?.startsWith("port_template")) {
      editDisabled = false;
    } else {
      editDisabled = !IF_CLASSES_ENABLED.has(distItem!.ifclass ?? "");
    }
  }

  // Initialize fields based on device type
  const initFields = (): Record<string, unknown> => {
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
    const dist: Record<string, unknown> = {};
    Object.entries(fields).forEach(([key, value]) => {
      dist[key] = (item as unknown as Record<string, unknown>)[key] ?? value;
    });
    if (distItem?.peer_hostname) {
      dist.description = distItem.peer_hostname;
    }
    ifData = dist;
  }

  // Populate fields from ifData
  if (ifData) {
    if (ifData.description) {
      fields.description = ifData.description;
    } else if (ifData.neighbor) {
      fields.description = `Uplink to ${String(ifData.neighbor)}`;
    } else if (ifData.neighbor_id) {
      fields.description = "MLAG peer link";
    }

    (
      [
        "aggregate_id",
        "bpdu_filter",
        "enabled",
        "redundant_link",
        "tags",
      ] as const
    ).forEach((fieldName) => {
      const ifDataRecord = ifData as Record<string, unknown>;
      if (fieldName in ifDataRecord) {
        fields[fieldName] = ifDataRecord[fieldName];
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
      fields.tagged_vlan_list = (ifData.tagged_vlan_list as unknown[]).map(
        (vlanItem) => {
          return mapVlanToName(vlanItem, vlanOptions);
        },
      );
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
  let currentConfigtype: string | null = null;
  let currentIfClass: string | null = null;
  let displayVlan = false;
  let displayVlanTagged = false;
  let displayTaggedToggle = false;
  let portTemplate: string | null = null;
  let currentEnabled = fields.enabled;

  if (deviceType === "ACCESS") {
    currentConfigtype =
      (ifDataUpdated?.configtype as string) ?? accessItem!.configtype ?? null;

    if (currentConfigtype === "ACCESS_TAGGED") {
      displayVlanTagged = true;
      displayTaggedToggle = true;
    }
    if (
      currentConfigtype &&
      ["ACCESS_TAGGED", "ACCESS_UNTAGGED"].includes(currentConfigtype)
    ) {
      displayVlan = true;
    }
    if (item.name in interfaceToggleUntagged) {
      displayVlanTagged = !displayVlanTagged;
    }
    if (ifDataUpdated?.enabled !== undefined) {
      currentEnabled = ifDataUpdated.enabled;
    }
  } else if (deviceType === "DIST") {
    currentIfClass = distItem!.ifclass?.startsWith("port_template")
      ? "port_template"
      : (distItem!.ifclass ?? null);

    if (ifDataUpdated?.ifclass) {
      currentIfClass = ifDataUpdated.ifclass as string;
    }

    if (currentIfClass?.startsWith("port_template")) {
      portTemplate =
        (ifDataUpdated?.port_template as string) ??
        distItem!.ifclass?.substring("port_template_".length) ??
        null;

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
  const optionalColumns = displayColumns.map((columnName) => (
    <Table.Cell collapsing key={columnName}>
      <OptionalColumn
        columnName={columnName}
        interfaceName={item.name}
        fields={fields}
        editDisabled={editDisabled}
        displayVlan={displayVlan}
        displayVlanTagged={displayVlanTagged}
        displayTaggedToggle={displayTaggedToggle}
        hostname={hostname}
        config={item.config ?? undefined}
        data={item.data ?? undefined}
        currentIfClass={currentIfClass}
        updateFieldData={updateFieldData}
        addTagOption={addTagOption}
        untaggedClick={untaggedClick}
      />
    </Table.Cell>
  ));

  // Render status icon
  let statusIcon: ReactNode = <Icon loading color="grey" name="spinner" />;
  const interfaceStatusDataLower: Record<
    string,
    Record<string, unknown>
  > = Object.fromEntries(
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
        // eslint-disable-next-line jsx-a11y/label-has-associated-control
        label={<label>Enable interface</label>}
        defaultChecked={currentEnabled as boolean}
        onChange={updateFieldData}
        disabled={editDisabled}
      />
    );

    let bounceDisabled = false;
    let statusMessage: ReactNode = null;
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
          speed={itemInterfaceStatusData.speed as number | undefined}
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
  let netboxInterfacePopup: ReactNode = null;
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

  let lldpNeighborPopup: ReactNode = null;
  if (Object.hasOwn(lldpNeighborData, item.name.toLowerCase())) {
    lldpNeighborPopup = (
      <LldpNeighborPopup
        // TODO(I4): type lldpNeighborData at reducer level (currently Record<string, unknown>)
        lldpNeighborData={
          lldpNeighborData[item.name.toLowerCase()] as LldpNeighbor[]
        }
      />
    );
  }

  let linknetWarningPopup: ReactNode = null;
  if (linknetMismatches[item.name]) {
    linknetWarningPopup = (
      <LinknetWarningPopup mismatch={linknetMismatches[item.name]} />
    );
  } else if (linknetCheckedPorts.includes(item.name)) {
    linknetWarningPopup = <LinknetOkButton />;
  }

  const descriptionDetails = (
    <div>
      <ButtonGroup size="mini" vertical>
        {netboxInterfacePopup}
        {lldpNeighborPopup}
        {linknetWarningPopup}
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
          key={`description|${item.name}|${fields.description}`}
          name={`description|${item.name}`}
          defaultValue={fields.description}
          disabled={editDisabled}
          onChange={updateFieldData}
        />
        {descriptionDetails}
      </Table.Cell>
      {deviceType === "ACCESS" && (
        <PortTypeCellAccess
          item={item as unknown as Record<string, unknown>}
          currentConfigtype={currentConfigtype}
          fields={fields}
          editDisabled={editDisabled}
          updateFieldData={updateFieldData}
        />
      )}
      {deviceType === "DIST" && (
        <PortTypeCellDist
          item={item as unknown as Record<string, unknown>}
          currentIfClass={currentIfClass}
          portTemplate={portTemplate}
          editDisabled={editDisabled}
          portTemplateOptions={portTemplateOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          updateFieldData={updateFieldData}
          addPortTemplateOption={addPortTemplateOption}
        />
      )}
      {optionalColumns}
    </Table.Row>
  );
}
