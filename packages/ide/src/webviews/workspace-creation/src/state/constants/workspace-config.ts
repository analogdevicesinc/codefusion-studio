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

import type {WorkspaceConfigState} from '../../common/types/state';

export const workspaceConfigInitialState: WorkspaceConfigState = {
	socId: '',
	workspaceTemplate: {},
	boardPackage: {
		boardId: '',
		packageId: ''
	},
	cores: {},
	coreToConfigId: undefined,
	workspaceConfig: {
		templateType: 'predefined',
		path: '',
		name: ''
	},
	configErrors: {
		soc: {notifications: []},
		boardPackage: {notifications: []},
		multiCoreTemplate: {notifications: []},
		cores: {notifications: []},
		coreConfig: {notifications: [], form: {}},
		workspaceDetails: {
			notifications: [],
			form: {
				isEmptyName: false,
				isEmptyPath: false
			}
		}
	}
};
