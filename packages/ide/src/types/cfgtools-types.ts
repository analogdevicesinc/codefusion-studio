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

import type {
  AIModel,
  CfsConfig,
  CfsFeatureScope,
  CfsMissingComponent,
  CfsSettings,
  CfsSocDataModel,
  ConfiguredApplicationPackage,
  ConfiguredClockNode,
  ConfiguredPin,
  ConfiguredProject,
  DFGStream,
  FirewallConfig,
  GasketConfig,
  Profiling,
  SocControl,
} from "cfs-types";
import type { CfsPackage, CfsPackageReference } from "cfs-package-manager";
import type { CodeGenerationProject } from "cfs-lib/dist/types/code-generation";

/**
 * Response returned by the initial SoC + persisted config bootstrap request.
 * The data model may be enriched with catalog metadata that is not part of
 * the raw cfs-types definition (e.g. `supportsMCUboot`).
 */
export type SocAndConfigResponse = {
  dataModel: CfsSocDataModel & { supportsMCUboot?: boolean };
  configOptions: CfsConfig;
};

/**
 * Payload describing a partial update to the persisted cfsconfig document.
 * Each field is optional so the webview can update only the slices that
 * changed.
 */
export type UpdatePersistedConfigPayload = {
  updatedPins?: ConfiguredPin[];
  updatedClockNode?: ConfiguredClockNode;
  initialControlValues?: Record<string, string>;
  modifiedClockNodes?: Array<{
    Name: string;
    EnabledControls: Record<string, boolean>;
  }>;
  updatedProjects?: ConfiguredProject[];
  clockFrequencies?: Record<string, string | number>;
  aiModels?: AIModel[];
};

export type UpdatePersistedDfgConfigPayload = {
  streams: DFGStream[];
  gaskets: GasketConfig[];
};

export type UpdateProfilingConfigPayload = {
  type: keyof Profiling;
  config: Partial<Profiling[keyof Profiling]>;
  projectId: string;
};

export type UpdateMcubootConfigPayload = {
  settings: CfsSettings;
  applicationPackages: ConfiguredApplicationPackage[];
};

export type UpdateFirewallConfigPayload = {
  firewall: FirewallConfig;
};

export type UpdateSRUConfigPayload = {
  connections: Record<string, string>;
  descriptions: Record<string, string>;
  signalAliases: Record<string, string>;
  signalInversions: Record<string, boolean>;
};

export type ShowSRUResetUndoNotificationPayload = {
  message: string;
  undoButtonLabel: string;
};

export type ShowSRUResetUndoNotificationResponse = {
  undo: boolean;
};

export type GenerateCodePayload = {
  selectedProjects: CodeGenerationProject[];
};

export type GenerateCodeResponse = string[];

export type GetPluginPropertiesPayload = {
  pluginId: string;
  pluginVersion: string;
  scope: CfsFeatureScope;
};

export type GetPluginPropertiesResponse = Record<string, SocControl[]>;

export type GetMemoryAccessOverridesPayload = {
  coreId: string;
};

export type GetMemoryAccessOverridesResponse =
  | Record<string, Record<string, string[] | undefined>>
  | undefined;

export type PackagerInstallPayload = {
  referencesToInstall: CfsPackageReference[];
};

export type PackagerInstallResultEntry = {
  reference: CfsPackageReference;
  success: boolean;
  data?: CfsPackageReference;
  error?: unknown;
};

export type PackagerSearchPayload = {
  components: CfsMissingComponent[];
};

export type PackagerSearchResultEntry = {
  id: string;
  packages: CfsPackage[];
};

export type PackagerUpdatePersistedVersionPayload = {
  componentId: string;
  version: string;
};

export type PackagerUpdatePersistedVersionResponse = {
  componentId: string;
  success: boolean;
  error?: string;
};

export type ExportCsvPayload = {
  csvContent: string;
  defaultFileName?: string;
};

export type ReadPemAlgorithmPayload = {
  filePath: string;
};

export type GeneratePemKeyPayload = {
  filePath: string;
  algorithm: string;
};

export type BannerFlagPayload = {
  flag: boolean;
};
