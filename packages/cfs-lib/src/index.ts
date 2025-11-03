/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
export { CfsFeatureScope } from "cfs-plugins-api";

// Export plugin types from cfs-plugins-api
export type {
	CfsPluginInfo,
	CfsPluginProperty,
	CfsWorkspace,
	CfsCodeGenerationContext,
	CfsConfig,
	CfsSocDataModel
} from "cfs-plugins-api";

// Managers
export { CfsPluginManager } from "./plugins/cfs-plugin-manager.js";
export { CfsDataModelManager } from "./managers/cfs-data-model-manager.js";
export { CfsToolManager } from "./managers/cfs-tool-manager.js";

// Utilities
export { CfsVariableResolver } from "./utils/cfs-variable-resolver.js";

// Manager type definitions
export type { DataModelMetaData } from "./managers/cfs-data-model-manager.d.ts";
export type {
	Tool,
	ToolInfo
} from "./managers/cfs-tool-manager.d.ts";

export type { TokenAuthSession } from "cfs-ccm-lib";
export { CfsApiClient } from "cfs-ccm-lib";
export type { AuthConfig } from "./auth/session-manager.js";
export { SessionManager } from "./auth/session-manager.js";
export { MyAnalogCloudsmithCredentialProvider } from "./auth/cloudsmith-credentials.js";

// Telemetry
export { TelemetryManager } from "./telemetry/telemetry-manager.js";
export type { SingleTelemetryMessage } from "./types/single-telemetry-message.js";
export type { MultipleTelemetryMessages } from "./types/multiple-telemetry-messages.js";
export {
	getAiToolsPlugin,
	type AiToolsUiData
} from "./ai-tools/index.js";

export { getHostPlatform } from "./utils/node-utils.js";
