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

import {type CoreType} from 'cfs-ccm-lib';
import type {CfsPluginInfo} from 'cfs-lib';

export type SoCFamily = {
	familyId: string;
	familyName: string;
	socs: SoCCatalog[];
};

export type SoCCatalog = {
	id: string;
	name: string;
	description: string;
	templates?: Template[];
	board: CatalogBoardInfo;
	cores: CatalogCoreInfo[];
};

export type CatalogBoardInfo = {
	standard: TStandardBoard[];
	custom: TCustomBoard[];
};

export type TStandardBoard = {
	boardId: string;
	packageId: string;
	name: string;
	description: string;
	packageLayout: string;
	url: string;
};

export type TCustomBoard = {
	boardId: string;
	packageId: string;
	name: string;
	description: string;
	packageLayout: string;
};

export type CatalogCoreInfo = {
	id: string;
	dataModelCoreID: string;
	name: string;
	plugins: CfsPluginInfo[];
	isPrimary?: boolean;
	coreType: CoreType;
};

export type CorePlatform = {
	id: string;
	name: string;
};

export type CodeGenPlugin = {
	id: string;
	name: string;
	description: string;
	firmwarePlatform: string;
	author: string;
	path: string;
	version: string;
};

export type Template = {
	id: string;
	name: string;
	description: string;
	folders: Array<{
		name: string;
		firmwarePlatform: string;
	}>;
};
