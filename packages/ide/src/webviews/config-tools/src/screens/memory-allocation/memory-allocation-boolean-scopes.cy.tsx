/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import type {ControlCfg, Soc} from '../../../../common/types/soc';
import {configurePreloadedStore} from '../../state/store';
import MemoryAllocation from './MemoryAllocation';
import {formatSocCoreMemoryBlocks} from '../../utils/json-formatter';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import {
	buildScopesDictionary,
	type ControlsByProjectScope
} from '../../utils/scopes';

const l10n =
	await import('../../../../../../l10n/bundle.l10n.en.json').then(
		module => module.default
	);

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			ProjectId: 'CM4-proj',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: ''
		},
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			ProjectId: 'RV-proj',
			Name: 'RISC-V (RV32)',
			PluginId: ''
		}
	]
} as unknown as CfsConfig;

const stackControl: ControlCfg = {
	Id: 'STACK',
	Description: 'Use for Stack',
	Type: 'boolean',
	Condition: `\${CoreId} \${String:CM4} =`,
	Scope: `\${CoreId} \${String: stack} +`
};

const heapControl: ControlCfg = {
	Id: 'HEAP',
	Description: 'Use for Heap',
	Type: 'boolean',
	Condition: `\${CoreId} \${String:CM4} =`,
	Scope: `\${CoreId} \${String: heap} +`
};

function TestMemoryAllocation() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<MemoryAllocation />
		</LocalizationProvider>
	);
}

function assertBooleanScopeConflict({
	conflictingControl,
	freeControl
}: {
	conflictingControl: ControlCfg;
	freeControl: ControlCfg;
}) {
	(window as any).__webview_localization_resources__ = l10n;

	window.localStorage.setItem(
		'pluginControls:CM4-proj',
		JSON.stringify({
			memory: [stackControl, heapControl]
		})
	);

	const configWithBooleanScopeConflicts: CfsConfig = {
		...mockedConfigDict,
		Projects: mockedConfigDict.Projects.map(project =>
			project.ProjectId === 'CM4-proj'
				? {
						...project,
						Partitions: [
							{
								Name: 'm4_flash',
								StartAddress: '0x10000000',
								Size: 65536,
								IsOwner: true,
								Config: {
									[conflictingControl.Id]: true,
									[freeControl.Id]: false
								},
								Access: 'R'
							},
							{
								Name: 'coredump_partition',
								StartAddress: '0x10300000',
								Size: 65536,
								IsOwner: true,
								Config: {
									[conflictingControl.Id]: true,
									[freeControl.Id]: false
								},
								Access: 'R'
							}
						]
					}
				: project
		)
	};

	const controlsByProjectScope: ControlsByProjectScope = [
		{
			controlScope: 'memory',
			projectId: 'CM4-proj',
			coreId: 'CM4',
			controlsByGroup: {
				memory: [stackControl, heapControl]
			}
		}
	];

	const scopeConflicts = buildScopesDictionary(
		controlsByProjectScope,
		configWithBooleanScopeConflicts
	);

	const reduxStore = configurePreloadedStore(
		mock,
		configWithBooleanScopeConflicts,
		undefined,
		scopeConflicts,
		controlsByProjectScope
	);

	cy.mount(<TestMemoryAllocation />, reduxStore);

	cy.dataTest('project-view-memory-card-container')
		.first()
		.within(() => {
			cy.dataTest('partition-details-chevron').click();
		});

	cy.dataTest('CM4-proj-m4_flash-scope-conflict-icon').should(
		'exist'
	);
	cy.dataTest(
		'CM4-proj-coredump_partition-scope-conflict-icon'
	).should('exist');

	cy.dataTest('edit-partition-btn').first().click();

	cy.dataTest(`checkbox-container:${conflictingControl.Id}-error`)
		.should('exist')
		.and(
			'contain.text',
			'This option is already used by coredump_partition.'
		);

	cy.dataTest(`checkbox-container:${freeControl.Id}-error`).should(
		'not.exist'
	);
}

describe('Memory Allocation boolean scope conflicts', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should show stack scope conflict and leave heap free', () => {
		assertBooleanScopeConflict({
			conflictingControl: stackControl,
			freeControl: heapControl
		});
	});

	it('should show heap scope conflict and leave stack free', () => {
		assertBooleanScopeConflict({
			conflictingControl: heapControl,
			freeControl: stackControl
		});
	});
});
