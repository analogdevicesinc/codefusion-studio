/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import type {CfsWorkspace} from 'cfs-lib';
import type {StatePlatformConfig} from './state';

export type WorkspaceConfig = {
	[K in keyof CfsWorkspace as Capitalize<
		string & K
	>]: CfsWorkspace[K];
};

export type WorkspaceCore = {
	Id: string;
	CoreId: string;
	Name: string;
	IsPrimary: boolean;
	IsEnabled: boolean;
	PluginId: string;
	PluginVersion: string;
	FirmwarePlatform: string;
	PlatformConfig: WorkspaceCoreConfig;
};

type CapitalizeObjectKeys<T> = {
	[K in keyof T as Capitalize<string & K>]: T[K];
};

export type WorkspaceCoreConfig =
	CapitalizeObjectKeys<StatePlatformConfig>;
