// Modal slice shapes owned by the device-list reducer.
//
// Each modal has an always-present slice. Payload fields are populated
// when the modal is open and nulled when closed.
//
// App-wide domain entities live in src/types/.
// Reducer state shape lives in ../stores/deviceListReducer.ts.
// API request/response payloads live in ../api/deviceListApi.ts.

import type { Device, DeviceState } from "../../../types/device";

export interface AddMgmtDomainModal {
  readonly isOpen: boolean;
  readonly deviceA: string | null;
  readonly deviceBCandidates: readonly Device[];
}

export interface DeleteModal {
  readonly isOpen: boolean;
  readonly device: Device | null;
}

export interface DeviceStateModal {
  readonly isOpen: boolean;
  readonly hostname: string | null;
  readonly deviceId: number | null;
  readonly newState: DeviceState | null;
}

export interface UpdateMgmtDomainModal {
  readonly isOpen: boolean;
  readonly mgmtId: number | null;
  readonly deviceA: string | null;
  readonly deviceB: string | null;
  readonly ipv4Initial: string | null;
  readonly ipv6Initial: string | null;
  readonly vlanInitial: number | null;
}

export interface ShowConfigModal {
  readonly isOpen: boolean;
  readonly hostname: string | null;
  readonly state: DeviceState | null;
}

export interface ChangeHostnameModal {
  readonly isOpen: boolean;
  readonly deviceId: number | null;
  readonly hostname: string | null;
}
