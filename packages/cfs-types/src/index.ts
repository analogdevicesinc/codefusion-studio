/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

/**
 * This file exports all type definitions from the cfs-types package.
 * See README.md for usage information.
 */

// Code Generation Types
export type { CfsCodeGenerationContext } from "./types/cfs-code-generation.d.ts";

// Config Types
export type {
	CfsConfig,
	ConfiguredPin,
	ConfiguredClockNode,
	ConfiguredProject,
	ConfiguredPeripheral,
	ConfiguredPartition,
	AIModel,
	AIModelBackend,
	Profiling,
	ZephelinInterface,
	Zephelin,
	PluginConfig,
	ControlErrorTypes,
	DFG,
	DFGStream,
	DFGEndpoint,
	GasketConfig,
	CfsSettings,
	MCUBootSettings,
	ConfiguredSigningKey,
	ConfiguredApplicationPackage,
	ConfiguredImage,
	ConfiguredCustomTLV,
	ConfiguredLocationType,
} from "./types/cfs-config.d.ts";

// Feature Types
export type { CfsFeatureScope, CfsFeature } from "./types/cfs-feature.d.ts";

// File Map Types
export type { CfsFileMap } from "./types/cfs-file-map.d.ts";

// Plugin Info Types
export type { CfsPluginInfo } from "./types/cfs-plugin-info.d.ts";

// Plugin Property Types
export type { CfsPluginProperty } from "./types/cfs-plugin-property.d.ts";

// Plugin Types
export type { CfsPlugin } from "./types/cfs-plugin.d.ts";

// Project Types
export type { CfsProject } from "./types/cfs-project.d.ts";

// Service Types
export type {
	CfsPropertyProviderService,
	CfsWorkspaceGenerationService,
	CfsProjectGenerationService,
	CfsCodeGenerationService,
	CfsSocControlsOverrideService,
	CfsProjectConfigService,
	CfsSystemConfigService,
	CfsMemoryAccessOverrideService,
} from "./types/cfs-services.d.ts";

// SoC Data Model Types
export type {
	CfsSocDataModel,
	SocPart,
	SocControl,
	SocControlValue,
	SocPackage,
	SocPinCanvas,
	SocPinCanvasLabel,
	SocPin,
	SocPinConfig,
	SocPinSignal,
	SocClockNode,
	SocConfigZephyr,
	SocRegister,
	SocRegisterField,
	SocPeripheral,
	SocCoreMemoryType,
	SocCoreMemoryAliasType,
	SocCoreMemory,
	SocCoreMemoryRef,
	SocCoreMemoryRange,
	SocCore,
	SocClock,
	SocClockOutput,
	SocGasketInputStream,
	SocGasketOutputStream,
	SocGasket,
	SocConfigFields,
	SocConfigField,
	Expression,
	SocAi,
	SocAiOpInfo,
	SocTraceInfo,
	SocTraceComponentInfo,
	SocTraceEventSource,
	SocTraceEventSourceGroup,
} from "./types/cfs-soc-data-model.d.ts";

// SoC Diagram Types
export type {
	SocDiagramData,
	SocDiagramClocks,
	SocCanvasClockCoordinates,
	SocDiagramNode,
	SocNodeTerminal,
	SocDiagramStyles,
} from "./types/cfs-soc-diagram-data.d.ts";

// SoC Info Types
export type { CfsSocInfo } from "./types/cfs-soc-info.d.ts";

// Task Types
export type { Task } from "./types/cfs-task.d.ts";

// Workspace Types
export type {
	CfsWorkspace,
	AIModelCfsWorkspace,
} from "./types/cfs-workspace.d.ts";

// AI Types
export type { AiBackend, AiTarget } from "./types/cfs-ai.d.ts";

// AI profiling types
export type { CfsAiProfilingData } from "./types/cfs-ai-profiling.d.ts";

export type {
	CfsMissingComponent,
	CfsComponentType,
	CfsUpdateResolution,
	CfsUpdateResolutionType,
} from "./types/cfs-component.d.ts";
