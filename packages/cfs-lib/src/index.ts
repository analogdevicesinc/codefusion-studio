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

export * from "./parsers/elf-parser/index.js";
export * from "./parsers/elf-parser/enums.js";
export { ElfDataModel } from "./parsers/elf-parser/ElfDataModel.js";
export { ElfHeuristics } from "./parsers/elf-parser/ElfHeuristics.js";
export { ElfProgramHeader } from "./parsers/elf-parser/ElfProgramHeader.js";
export { ElfSectionHeader } from "./parsers/elf-parser/ElfSectionHeader.js";
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
export {
	compileJsonSchemaValidator,
	type JsonSchemaValidator
} from "./utils/json-schema-validator.js";
export * from "./types/soc.js";
export { DtParser } from "./parsers/dt-parser/DtParser.js";

// Configuration file management (.cfsconfig)
export {
	CfsConfigValidator,
	CURRENT_SCHEMA_VERSION
} from "./config/cfs-config-validator.js";
export { CfsConfigError } from "./config/cfs-config-error.js";
export type { CfsConfigErrorCode } from "./config/cfs-config-error.js";
export type {
	CheckDiagnostic,
	CheckResult,
	CheckSeverity
} from "./config/check-types.js";
export { isErrorSeverity, isValid } from "./config/check-types.js";

// Configuration validation checks (.cfsconfig semantics)
export {
	pinInConflict,
	validatePinConfiguration
} from "./validation/pin-validation.js";
export { validatePeripheralControls } from "./validation/peripheral-validation.js";
export {
	computeErrorPerControl,
	generateControlErrorMessage,
	generateValidationErrorType,
	getFormErrors
} from "./validation/control-validation.js";
export type {
	ControlType,
	FormFieldValue,
	NumericBase
} from "./validation/control-validation.js";

// Runtime values for CfsFeatureScope (types should be imported directly from cfs-types)
export const CfsFeatureScopeValues = [
	"workspace",
	"project",
	"codegen",
	"memory",
	"peripheral",
	"pinConfig",
	"clockConfig",
	"dfg",
	"aiprof"
] as const;

// Managers
export {
	CfsPluginManager,
	type PluginSocContext,
	type CodeGenerationOptions
} from "./managers/cfs-plugin-manager.js";
export { CfsDataModelManager } from "./managers/cfs-data-model-manager.js";
export { CfsToolManager } from "./managers/cfs-tool-manager.js";

// Providers
export { CfsTaskProvider } from "./providers/cfs-task-provider.js";
export type {
	DefaultTaskDiscoveryStrategy,
	TaskDiscoveryStrategy
} from "./types/task-discovery-strategy.js";
export { CfsShellEnvProvider } from "./providers/cfs-shell-env-provider.js";
export type { ShellEnvOptions } from "./providers/cfs-shell-env-provider.js";
export { CfsTaskDiscoveryStrategy } from "./providers/cfs-task-discovery-strategy.js";
export { MsdkTaskStrategy } from "./providers/msdk-task-strategy.js";
export { ZephyrTaskStrategy } from "./providers/zephyr-task-strategy.js";
export {
	PLATFORM_IDS,
	ZEPHYR_ARM_TOOLCHAIN_TOOL_ID as ZEPHYR_HOST_TOOLS_ID,
	type PlatformId
} from "./providers/platform-constants.js";

// Board DTS utilities
export {
	parseBoardDts,
	resolveBoardDtsPath
} from "./utils/board-dts-utils.js";

// Utilities
export { CfsVariableResolver } from "./utils/cfs-variable-resolver.js";
export type { VariableResolver } from "./utils/cfs-variable-resolver.js";
export {
	detectToolchain,
	resolveZephyrHostToolsId,
	getZephyrSdkPath,
	resolveZephyrSdkRoot
} from "./utils/detect-toolchain.js";
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
export {
	CfsApiClient,
	CfsApiError,
	SocCatalog,
	ApiKeyAuthorizer
} from "cfs-ccm-lib";
export type { AuthConfig } from "./auth/session-manager.js";
export { SessionManager } from "./auth/session-manager.js";
export { MyAnalogCloudsmithCredentialProvider } from "./auth/cloudsmith-credentials.js";
export {
	DefaultConanCloudsmithRemotesProvider,
	RemotesProviderWithFallback,
	MyAnalogConanCloudsmithRemotesProvider
} from "./packages/cloudsmith-remotes.js";
export { PackageLicenseReporter } from "./license/license-acceptance-reporter.js";
export { CatalogManager } from "./catalog/cfs-catalog-manager.js";
export { SWPackageCatalogManager } from "./catalog/swpackage-catalog-manager.js";
export type { SWPackageCatalogManagerOptions } from "./catalog/swpackage-catalog-manager.js";
export { createSWPackageSource } from "./packages/swpackage-source.js";
export { CustomRemoteCatalogManager } from "./catalog/custom-remote-catalog-manager.js";
export type {
	CustomRemoteApplyOptions,
	CustomRemoteApplyResult,
	CustomRemoteChanges,
	CustomRemoteFailure
} from "./catalog/custom-remote-catalog-manager.js";
export type {
	SWPackageSource,
	SWPackageSourceOptions
} from "./packages/swpackage-source.js";

// Telemetry
export { TelemetryManager } from "./telemetry/telemetry-manager.js";
export type { SingleTelemetryMessage } from "./types/single-telemetry-message.js";
export type { MultipleTelemetryMessages } from "./types/multiple-telemetry-messages.js";
export { UserType } from "./telemetry/telemetry-manager.js";
export {
	setTelemetryLogger,
	getTelemetryLogger
} from "./telemetry/telemetry-logger.js";
export type { Logger } from "./types/logger.js";
export {
	getAiToolsPlugin,
	type AiToolsData,
	AiCommandError
} from "./ai-tools/ai-tools.js";
export { default as AIToolsPlugin } from "./ai-tools/ai-tools.js";
export {
	resolveSource,
	getCFSCachePath,
	getValidExtensions,
	generateProfilingReport
} from "./ai-tools/ai-tools-utils.js";
export {
	generateAIArtifacts,
	generateAIWorkspace
} from "./ai-tools/ai-workspace-generation.js";
export {
	enforceMaxActiveModels,
	enforceOneActiveBackendPerTarget,
	findModelIdentifierCollision,
	MAX_MODEL_NAME_LENGTH,
	validateModelNameLength
} from "./ai-tools/ai-tools-model-utils.js";
export {
	TELEMETRY_APP_ID,
	TELEMETRY_URL
} from "./telemetry/telemetry-credentials.js";
export { getHostPlatform } from "./utils/node-utils.js";
export type { CfsCancellationToken } from "./utils/cancellation.js";

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

// Profiler / Trace Capture
export { Recording } from "./profiler/recording.js";
export { CTF_TRACE_START_TAG } from "./profiler/tracing-protocol.js";
export type {
	RecordingFormat,
	RecordingOptions
} from "./profiler/recording.js";
export { LiveTrace } from "./profiler/live-trace.js";
export type { LiveTraceOptions } from "./profiler/live-trace.js";
export {
	SerialSourceConfig,
	UsbSourceConfig,
	createDataSource
} from "./profiler/data-source-factory.js";
export type { DataSourceConfig } from "./profiler/data-source-factory.js";
export {
	DEFAULT_SERIAL_PORT_SETTINGS,
	VALID_DATA_BITS,
	VALID_PARITY,
	VALID_STOP_BITS,
	getWorkspaceSerialSettings,
	isDataBits,
	isParity,
	isStopBits
} from "./profiler/serial-port-settings.js";
export type {
	DataBits,
	Parity,
	SerialLineOptions,
	SerialPortSettings,
	StopBits
} from "./profiler/serial-port-settings.js";
export type { IProfilerDataSource } from "./profiler/data-source.js";
export { convertTrace } from "./profiler/trace-conversion-service.js";
export type { TraceConversionOptions } from "./profiler/trace-conversion-service.js";
export {
	buildRuntimeReportFromTef,
	convertTefToReport,
	InvalidTefError
} from "./profiler/tef-to-report-converter.js";
export type { TefToReportOptions } from "./profiler/tef-to-report-converter.js";
export {
	listUsbDevices,
	findUsbDevice,
	onUsbDeviceDetached
} from "./profiler/usb-device-directory.js";
export type { UsbDeviceDescriptor } from "./profiler/usb-device-directory.js";

// String Utils
export { caseInsensitiveCompare } from "./utils/string-utils.js";

export { C_CPP_RESERVED_KEYWORDS } from "./utils/c-utils.js";
