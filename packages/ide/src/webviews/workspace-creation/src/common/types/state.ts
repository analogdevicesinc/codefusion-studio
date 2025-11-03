/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import type {CfsPluginInfo} from 'cfs-lib';

export type WorkspaceConfigState = {
	socId: string;
	boardPackage: BoardPackage;
	cores: Record<string, StateProject>;
	coreToConfigId: string | undefined;
	workspaceTemplate: Partial<CfsPluginInfo> | undefined;
	workspaceConfig: WorkspaceConfig;
	configErrors: ConfigErrors;
	currentCoreConfigStep: number;
	supportsTrustZone?: boolean;
	isTrustZoneEnabled: Record<string, boolean>;
};

type WorkspaceConfig = {
	templateType: WorkspaceTemplateType;
	path: string;
	name: string;
};

export type BoardPackage = {
	boardId: string;
	packageId: string;
};

export type ConfigErrors = {
	soc: Errors;
	boardPackage: Errors;
	multiCoreTemplate: Errors;
	cores: Errors;
	coreConfig: Errors;
	workspaceDetails: Errors;
};

export type Errors = {
	notifications: string[];
	form?: Record<string, unknown>;
};

export type StateProject = {
	id: string;
	coreId: string;
	name?: string;
	pluginId: string;
	pluginVersion: string;
	firmwarePlatform?: string;
	isPrimary?: boolean;
	Secure?: boolean;
	isEnabled: boolean;
	supportsTrustZone?: boolean;
	platformConfig: Record<string, string | boolean | number>;
};

export type StatePlatformConfig = StateProject['platformConfig'];

export type WorkspaceTemplateType = 'predefined' | 'custom';
