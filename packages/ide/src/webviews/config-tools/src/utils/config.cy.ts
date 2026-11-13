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

import type {CfsConfig} from 'cfs-types';
import type {Soc} from '../../../common/types/soc';
import {configurePreloadedStore} from '../state/store';
import {getAssignedPlugin, getPrimaryProjectId} from './config';
import {sysPlannerDataInit} from './sys-planner-data-init';

const max32657wlp = (await import('@socs/max32657-wlp.json').then(
	module => module.default
)) as Soc;

const max32690wlp = (await import('@socs/max32690-wlp.json').then(
	module => module.default
)) as Soc;

const secureProjectDict = {
	Soc: 'MAX32657',
	BoardName: '',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'CM33',
			ProjectId: 'Project2',
			Secure: false
		},
		{
			CoreId: 'CM33',
			ProjectId: 'primary',
			Secure: true
		}
	]
} as unknown as CfsConfig;

const normalProjectDict = {
	Soc: 'MAX32690',
	BoardName: '',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'RV',
			ProjectId: 'Project2'
		},
		{
			CoreId: 'CM4',
			ProjectId: 'primary'
		}
	]
} as unknown as CfsConfig;

describe('Config Utilities', () => {
	it('getPrimaryProjectId should return the primary project id for configuration with secure projects', () => {
		sysPlannerDataInit(max32657wlp, secureProjectDict);

		const primaryProjectId = getPrimaryProjectId();

		expect(primaryProjectId).to.equal('primary');
	});

	it('getPrimaryProjectId should return the primary project id for configuration without secure projects', () => {
		sysPlannerDataInit(max32690wlp, normalProjectDict);

		const primaryProjectId = getPrimaryProjectId();

		expect(primaryProjectId).to.equal('primary');
	});

	it('getAssignedPlugin should retain the config range and return the resolved version separately', () => {
		const config = {
			...normalProjectDict,
			Projects: [
				{
					CoreId: 'CM4',
					ProjectId: 'primary',
					PluginId: 'com.analog.project.msdk.plugin',
					PluginVersion: '^1.1.0',
					FirmwarePlatform: 'msdk'
				}
			]
		} as unknown as CfsConfig;

		configurePreloadedStore(
			max32690wlp,
			config,
			undefined,
			undefined,
			undefined,
			{primary: '1.3.0'}
		);

		const plugin = getAssignedPlugin('primary');

		expect(plugin?.pluginVersion).to.equal('^1.1.0');
		expect(plugin?.resolvedPluginVersion).to.equal('1.3.0');
		expect(config.Projects[0].PluginVersion).to.equal('^1.1.0');
	});

	it('should preserve a persisted version for a prototype-named project without an override', () => {
		const config = {
			...normalProjectDict,
			Projects: [
				{
					CoreId: 'CM4',
					ProjectId: 'constructor',
					PluginId: 'com.analog.project.msdk.plugin',
					PluginVersion: '^1.1.0',
					FirmwarePlatform: 'msdk'
				}
			]
		} as unknown as CfsConfig;

		configurePreloadedStore(
			max32690wlp,
			config,
			undefined,
			undefined,
			undefined,
			{}
		);

		expect(getAssignedPlugin('constructor')?.pluginVersion).to.equal(
			'^1.1.0'
		);
	});
});
