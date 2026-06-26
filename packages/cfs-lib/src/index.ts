/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

export { SampleParser } from "./sample-parser/sample-parser.js";
export {
	mapHeaderInfoData,
	convertHeaderBigIntsToStrings,
	convertHeaderBigIntsToNumber,
	mapArmAttributes,
	mapSections,
	mapSegments,
	getSegmentFlags,
	getSegmentTypes,
	decimalToHex,
	HeaderInfo,
	HeaderResponseData,
	TExtendedSegment,
	TSection,
	TSymbol,
	TExtendedSymbol,
	TSegment
} from "./utils/parser-utils.js";
export {
	getFlags,
	getBucket,
	getMachineFlags
} from "./utils/elf-flags-handler.js";
export * from "./utils/file-utils.js";
export * from "./types/soc.js";
export { DtParser } from "./dt-parser/DtParser.js";

// Runtime values for CfsFeatureScope (types should be imported directly from cfs-types)
export const CfsFeatureScopeValues = [
	"workspace",
	"project",
	"codegen",
	"memory",
	"peripheral",
	"pinConfig",
	"clockConfig",
	"dfg"
] as const;

// Managers
export { CfsPluginManager } from "./plugins/cfs-plugin-manager.js";
export { CfsDataModelManager } from "./managers/cfs-data-model-manager.js";
export { CfsToolManager } from "./managers/cfs-tool-manager.js";

// Providers
export { CfsTaskProvider } from "./providers/cfs-task-provider.js";
export type {
	DefaultTaskDiscoveryStrategy,
	TaskDiscoveryStrategy
} from "./types/task-discovery-strategy.js";
export { CfsShellEnvProvider } from "./providers/cfs-shell-env-provider.js";
export type {
	ToolEnvVar,
	ShellEnvOptions
} from "./providers/cfs-shell-env-provider.js";
export { CfsTaskDiscoveryStrategy } from "./providers/cfs-task-discovery-strategy.js";
export { MsdkTaskStrategy } from "./providers/msdk-task-strategy.js";
export { ZephyrTaskStrategy } from "./providers/zephyr-task-strategy.js";
export {
	PLATFORM_IDS,
	type PlatformId
} from "./providers/platform-constants.js";

// Utilities
export { CfsVariableResolver } from "./utils/cfs-variable-resolver.js";
export type { VariableResolver } from "./utils/cfs-variable-resolver.js";
export { detectToolchain, resolveZephyrSdkRoot } from "./utils/detect-toolchain.js";
export { globFiles } from "./utils/file-glob.js";
export type { GlobOptions } from "./utils/file-glob.js";
export {
	findLatestVersion,
	findMatchingVersion
} from "./utils/semantic-versioning.js";
export { findWorkspaceConfigFile } from "./utils/workspace-utils.js";

// Manager type definitions
export type { DataModelMetaData } from "./managers/cfs-data-model-manager.d.ts";
export type { ToolInfo } from "./managers/cfs-tool-manager.d.ts";

export type { TokenAuthSession } from "cfs-ccm-lib";
export { CfsApiClient, SocCatalog } from "cfs-ccm-lib";
export type { AuthConfig } from "./auth/session-manager.js";
export { SessionManager } from "./auth/session-manager.js";
export { MyAnalogCloudsmithCredentialProvider } from "./auth/cloudsmith-credentials.js";
export { PackageLicenseReporter } from "./license/license-acceptance-reporter.js";
export { CatalogManager } from "./catalog/cfs-catalog-manager.js";

// Telemetry
export { TelemetryManager } from "./telemetry/telemetry-manager.js";
export type { SingleTelemetryMessage } from "./types/single-telemetry-message.js";
export type { MultipleTelemetryMessages } from "./types/multiple-telemetry-messages.js";
export { UserType } from "./telemetry/telemetry-manager.js";
export {
	getAiToolsPlugin,
	type AiCommandResult,
	type AiToolsData,
	type CodeGenJsonMsg
} from "./ai-tools/index.js";
export {
	parseAICodegenEvents,
	resolveSource,
	getCFSCachePath,
	getValidExtensions
} from "./ai-tools/ai-tools-utils.js";
export {
	enforceMaxActiveModels,
	enforceOneActiveBackendPerTarget
} from "./ai-tools/ai-tools-model-utils.js";
export {
	TELEMETRY_APP_ID,
	TELEMETRY_URL
} from "./telemetry/telemetry-credentials.js";
export { getHostPlatform } from "./utils/node-utils.js";

// Task Resources
export { default as msdkTasks } from "./resources/msdk-tasks.js";
export { default as msdkTasksSubset } from "./resources/msdk-tasks-subset.js";
export { default as zephyrTasks } from "./resources/zephyr-tasks.js";
export { cfsSettingDefaults } from "./resources/cfs-setting-defaults.js";

// Error Instances
export { MissingDependencyError } from "./utils/missing-dependency-error.js";

// Docker Utils
export {
	getContainerUtility,
	containerImageExists,
	pullImage,
	extractRegistryAndRepoName,
	getCredentials
} from "./utils/docker-utils.js";
