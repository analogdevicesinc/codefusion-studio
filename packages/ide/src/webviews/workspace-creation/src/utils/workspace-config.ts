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

import {getWorkspaceConfig} from './api';
import type {WorkspaceConfig} from '../common/types/config';

export let workspaceConfig: WorkspaceConfig;

if (import.meta.env.MODE === 'development') {
	workspaceConfig = {
		Soc: '',
		WorkspacePluginId: '',
		Board: '',
		Package: '',
		Cores: [],
		WorkspaceName: '',
		Location: ''
	};
} else {
	const res = await getWorkspaceConfig();
	workspaceConfig = res as WorkspaceConfig;
}

export function getCurrentConfigOptions() {
	return workspaceConfig;
}

export function isWorkspaceNameInvalid(wrkspName: string) {
	return /[^a-zA-Z0-9_.-]/.test(wrkspName ?? '');
}

export function isPathInvalid(path: string) {
	return /[ !"$%&'()*+,;<=>?@[\]^{|}~\s]/.test(path ?? '');
}
