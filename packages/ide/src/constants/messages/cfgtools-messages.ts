/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type { NotificationType, RequestType } from "vscode-messenger-common";
import type {
  BannerFlagPayload,
  ExportCsvPayload,
  GenerateCodePayload,
  GeneratePemKeyPayload,
  GetMemoryAccessOverridesPayload,
  GetMemoryAccessOverridesResponse,
  GetPluginPropertiesPayload,
  GetPluginPropertiesResponse,
  PackagerInstallPayload,
  PackagerInstallResultEntry,
  PackagerSearchPayload,
  PackagerSearchResultEntry,
  PackagerUpdatePersistedVersionPayload,
  PackagerUpdatePersistedVersionResponse,
  ReadPemAlgorithmPayload,
  ShowSRUResetUndoNotificationPayload,
  ShowSRUResetUndoNotificationResponse,
  SocAndConfigResponse,
  UpdateFirewallConfigPayload,
  UpdateMcubootConfigPayload,
  UpdatePersistedConfigPayload,
  UpdatePersistedDfgConfigPayload,
  UpdateProfilingConfigPayload,
  UpdateSRUConfigPayload,
} from "../../types/cfgtools-types";

// ---------------------------------------------------------------------------
// Initial data + persistence
// ---------------------------------------------------------------------------

/**
 * Returns the SoC data model and the currently persisted cfsconfig used
 * to bootstrap the cfgtools webview.
 */
export const getSocAndConfigRequest: RequestType<void, SocAndConfigResponse> = {
  method: "cfgtools/getSocAndConfig",
};

export const updatePersistedConfigNotification: NotificationType<UpdatePersistedConfigPayload> =
  {
    method: "cfgtools/updatePersistedConfig",
  };

export const updatePersistedDfgConfigNotification: NotificationType<UpdatePersistedDfgConfigPayload> =
  {
    method: "cfgtools/updatePersistedDfgConfig",
  };

export const updateProfilingConfigNotification: NotificationType<UpdateProfilingConfigPayload> =
  {
    method: "cfgtools/updateProfilingConfig",
  };

export const updateMcubootConfigNotification: NotificationType<UpdateMcubootConfigPayload> =
  {
    method: "cfgtools/updateMcubootConfig",
  };

export const updateSRUConfigNotification: NotificationType<UpdateSRUConfigPayload> =
  {
    method: "cfgtools/updateSRUConfig",
  };

export const showSRUResetUndoNotificationRequest: RequestType<
  ShowSRUResetUndoNotificationPayload,
  ShowSRUResetUndoNotificationResponse
> = {
  method: "cfgtools/showSRUResetUndoNotification",
};

export const updateFirewallConfigNotification: NotificationType<UpdateFirewallConfigPayload> =
  {
    method: "cfgtools/updateFirewallConfig",
  };

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

export const generateCodeRequest: RequestType<GenerateCodePayload, string[]> = {
  method: "cfgtools/generateCode",
};

export const cancelGenerateCodeRequest: RequestType<void, void> = {
  method: "cfgtools/cancelGenerateCode",
};

// ---------------------------------------------------------------------------
// Plugin / data model introspection
// ---------------------------------------------------------------------------

export const getPluginPropertiesRequest: RequestType<
  GetPluginPropertiesPayload,
  GetPluginPropertiesResponse
> = {
  method: "cfgtools/getPluginProperties",
};

export const getMemoryAccessOverridesRequest: RequestType<
  GetMemoryAccessOverridesPayload,
  GetMemoryAccessOverridesResponse
> = {
  method: "cfgtools/getMemoryAccessOverrides",
};

// ---------------------------------------------------------------------------
// Banner / warning persistence (per-user globalState toggles)
// ---------------------------------------------------------------------------

export const getIsPeripheralBannerRequest: RequestType<void, boolean> = {
  method: "cfgtools/getIsPeripheralBanner",
};

export const updateIsPeripheralBannerNotification: NotificationType<BannerFlagPayload> =
  {
    method: "cfgtools/updateIsPeripheralBanner",
  };

export const getGenerateCodeWarningRequest: RequestType<void, boolean> = {
  method: "cfgtools/getGenerateCodeWarning",
};

export const setGenerateCodeWarningNotification: NotificationType<BannerFlagPayload> =
  {
    method: "cfgtools/setGenerateCodeWarning",
  };

export const getApplicationPackagesBannerRequest: RequestType<void, boolean> = {
  method: "cfgtools/getApplicationPackagesBanner",
};

export const setApplicationPackagesBannerRequest: RequestType<
  BannerFlagPayload,
  void
> = {
  method: "cfgtools/setApplicationPackagesBanner",
};

export const getDeleteAppPackWarningRequest: RequestType<void, boolean> = {
  method: "cfgtools/getDeleteAppPackWarning",
};

export const setDeleteAppPackWarningRequest: RequestType<
  BannerFlagPayload,
  void
> = {
  method: "cfgtools/setDeleteAppPackWarning",
};

// Compatibility methods retained for the legacy config-tools request bridge.
export const setDeleteFirewallZoneWarningRequest: RequestType<
  BannerFlagPayload,
  void
> = {
  method: "cfgtools/setDeleteFirewallZoneWarning",
};

export const getDeleteFirewallZoneWarningRequest: RequestType<void, boolean> = {
  method: "cfgtools/getDeleteFirewallZoneWarning",
};

export const setDeleteInitiatorResponderWarningRequest: RequestType<
  BannerFlagPayload,
  void
> = {
  method: "cfgtools/setDeleteInitiatorResponderWarning",
};

export const getDeleteInitiatorResponderWarningRequest: RequestType<
  void,
  boolean
> = {
  method: "cfgtools/getDeleteInitiatorResponderWarning",
};

export const getDeleteCustomTLVWarningRequest: RequestType<void, boolean> = {
  method: "cfgtools/getDeleteCustomTLVWarning",
};

export const setDeleteCustomTLVWarningRequest: RequestType<
  BannerFlagPayload,
  void
> = {
  method: "cfgtools/setDeleteCustomTLVWarning",
};

// ---------------------------------------------------------------------------
// MCUboot signing key utilities
// ---------------------------------------------------------------------------

/**
 * Reads a PEM-encoded private key and returns a normalized algorithm
 * identifier (e.g. "rsa-2048", "ecdsa-p256").
 */
export const readPemAlgorithmRequest: RequestType<
  ReadPemAlgorithmPayload,
  string
> = {
  method: "cfgtools/readPemAlgorithm",
};

/**
 * Generates a new PEM signing key at the given path using the Zephyr-bundled
 * `imgtool.py keygen` for the requested algorithm.
 */
export const generatePemKeyRequest: RequestType<GeneratePemKeyPayload, void> = {
  method: "cfgtools/generatePemKey",
};

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Prompts the user for a save location and writes the provided CSV content
 * to disk. Resolves with the saved path, or `undefined` if cancelled.
 */
export const exportCsvRequest: RequestType<
  ExportCsvPayload,
  string | undefined
> = {
  method: "cfgtools/exportCsv",
};

// ---------------------------------------------------------------------------
// Package manager integration (cfsconfig-aware)
// ---------------------------------------------------------------------------

export const packagerInstallRequest: RequestType<
  PackagerInstallPayload,
  PackagerInstallResultEntry[]
> = {
  method: "cfgtools/packager/install",
};

export const packagerSearchRequest: RequestType<
  PackagerSearchPayload,
  PackagerSearchResultEntry[]
> = {
  method: "cfgtools/packager/search",
};

export const packagerUpdatePersistedDataModelVersionRequest: RequestType<
  PackagerUpdatePersistedVersionPayload,
  PackagerUpdatePersistedVersionResponse
> = {
  method: "cfgtools/packager/updatePersistedDataModelVersion",
};

export const packagerUpdatePersistedPluginVersionRequest: RequestType<
  PackagerUpdatePersistedVersionPayload,
  PackagerUpdatePersistedVersionResponse
> = {
  method: "cfgtools/packager/updatePersistedPluginVersion",
};
