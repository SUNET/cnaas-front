// Modal "conf" view-model types — held as `useState` in DeviceList.tsx
// and threaded into each action-modal as props.
//
// App-wide domain entities live in src/types/.
// Reducer state shapes live in ../stores/deviceListReducer.ts.
// API request/response payloads live in ../api/deviceListApi.ts.

import type { Device, DeviceState } from "../../../types/device";

export interface AddMgmtDomainModalConf {
  readonly isOpen: boolean;
  readonly deviceA: string | null;
  readonly deviceBCandidates: Device[];
}

export interface DeleteModalConf {
  readonly device: Device | null;
  readonly isOpen: boolean;
}

export interface DeviceStateModalConf {
  readonly isOpen: boolean;
  readonly hostname: string | null;
  readonly deviceId: number | null;
  readonly newState: DeviceState | null;
}

export interface UpdateMgmtDomainModalConf {
  readonly isOpen: boolean;
  readonly mgmtId: number | null;
  readonly deviceA: string | null;
  readonly deviceB: string | null;
  readonly ipv4Initial: string | null;
  readonly ipv6Initial: string | null;
  readonly vlanInitial: number | null;
}

export interface ShowConfigModalConf {
  readonly isOpen: boolean;
  readonly hostname: string | null;
  readonly state: DeviceState | null;
}

export interface ChangeHostnameModalConf {
  readonly isOpen: boolean;
  readonly deviceId?: number | null;
  readonly hostname?: string | null;
}
