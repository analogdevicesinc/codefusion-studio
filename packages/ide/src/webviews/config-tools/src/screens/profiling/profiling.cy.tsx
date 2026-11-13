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
import type {Soc} from '@common/types/soc';
import type {ConfigOptionsReturn} from '../../../../common/api';
import {Provider} from 'react-redux';
import {configurePreloadedStore} from '../../state/store';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import {initializeConfigDict} from '../../utils/config';
import {Profiling} from './profiling';
import {setupMessengerMock} from '../../../../common/test-utils/messenger-mock';
import {
	setCpuLoadInterval,
	setInterface,
	setMemoryUsageInterval,
	toggleCpuLoadEnabled,
	toggleMemoryUsageEnabled,
	toggleProfilingEnabled
} from '../../state/slices/profiling/profiling.reducer';
import {
	getMinCpuLoadInterval,
	getMinProfilingMemoryInterval
} from '../../state/slices/profiling/profilingPeripherals';

const wlp = (await import('@socs/max32690-wlp.json').then(
	module => module.default
)) as Soc;

const l10n =
	await import('../../../../../../l10n/bundle.l10n.en.json').then(
		module => module.default
	);

(window as any).__webview_localization_resources__ = l10n;

type CfsConfigOptions = NonNullable<
	ConfigOptionsReturn['configOptions']
>;

const baseCfsConfig: CfsConfigOptions = {
	BoardName: 'TestBoard',
	Soc: 'MAX32690',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'CM4',
			ProjectId: 'main_project',
			PluginId: 'com.analog.project.zephyr.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr',
			ExternallyManaged: false,
			PlatformConfig: {},
			Partitions: [],
			Peripherals: []
		},
		{
			CoreId: 'RV',
			ProjectId: 'secondary_project',
			PluginId: 'com.analog.project.zephyr.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr',
			ExternallyManaged: false,
			PlatformConfig: {},
			Partitions: [],
			Peripherals: []
		}
	],
	ClockNodes: [],
	Peripherals: [],
	Cores: [],
	Copyright: '',
	SchemaVersion: '2.1.0',
	DataModelSchemaVersion: '',
	DataModelVersion: '1.0.0',
	Pins: [],
	Partitions: [],
	Timestamp: ''
};

// Create a test store using configurePreloadedStore
function createTestStore(
	configOverrides: Partial<CfsConfigOptions> = {}
) {
	const testConfig: CfsConfigOptions = {
		...baseCfsConfig,
		...configOverrides,
		Projects: configOverrides.Projects ?? baseCfsConfig.Projects
	};

	initializeConfigDict(testConfig, wlp);

	return configurePreloadedStore(wlp, testConfig);
}

// Test wrapper component with all required providers
function TestComponent({
	store
}: {
	readonly store: ReturnType<typeof createTestStore>;
}) {
	return (
		<Provider store={store}>
			<LocalizationProvider namespace='cfgtools'>
				<Profiling />
			</LocalizationProvider>
		</Provider>
	);
}

describe('Profiling Configuration View', () => {
	before(() => {
		setupMessengerMock();
	});

	it('should render localized profiling header and beta badge', () => {
		const store = createTestStore();

		cy.mount(<TestComponent store={store} />);

		cy.contains('h1', l10n.cfgtools.profiling.title).should('exist');
		cy.contains('p', l10n.cfgtools.profiling.subtitle).should(
			'exist'
		);
		cy.contains('BETA').should('exist');
	});

	it('should render project sections from base cfsconfig', () => {
		const store = createTestStore();

		cy.mount(<TestComponent store={store} />);

		cy.get('h2').should('have.length', 2);
		cy.contains('p', l10n.cfgtools.profiling.enableProfiling).should(
			'exist'
		);

		cy.get('[data-test^="profiling-zephelin-config:"]').should(
			'have.length',
			2
		);
		cy.get(
			'[data-test^="profiling-zephelin-config:"] header[role="button"]'
		).should('have.length', 2);
	});

	it('should show no project sections when Projects is empty', () => {
		const store = createTestStore({Projects: []});

		cy.mount(<TestComponent store={store} />);

		cy.contains('h1', l10n.cfgtools.profiling.title).should('exist');
		cy.get('h2').should('have.length', 0);
		cy.contains('p', l10n.cfgtools.profiling.enableProfiling).should(
			'not.exist'
		);
	});

	it('should handle editing of the config', () => {
		const store = createTestStore();

		cy.mount(<TestComponent store={store} />);

		cy.dataTest('profiling-zephelin-config:CM4').should('exist');

		cy.dataTest('profiling-zephelin-config:CM4').within(() => {
			cy.dataTest('profiling-select-trace-interface-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-trace-interface-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-baud-rate-field').should('not.exist');

			cy.get('header[role="button"]').click();

			cy.dataTest('profiling-memory-usage-interval-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-cpu-load-interval-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-trigger-function-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-stopper-function-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-trace-interface-field').should('exist');
			cy.dataTest('profiling-baud-rate-field').should('exist');

			cy.get('#select-trace-interface-CM4-controlDropdown').should(
				'exist'
			);
			cy.get('#select-trace-interface-CM4-controlDropdown').should(
				'be.disabled'
			);

			cy.dataTest('enable-profiling-toggle-span').click();

			cy.get('#select-trace-interface-CM4-controlDropdown').should(
				'not.be.disabled'
			);

			cy.dataTest('profiling-memory-usage-checkbox').click({
				force: true
			});
			cy.dataTest('profiling-memory-usage-interval-field').should(
				'exist'
			);

			cy.dataTest('profiling-cpu-load-checkbox').click({force: true});
			cy.dataTest('profiling-cpu-load-interval-field').should(
				'exist'
			);

			cy.dataTest('profiling-application-callgraph-checkbox').click({
				force: true
			});
			cy.dataTest('profiling-trigger-function-field').should('exist');
			cy.dataTest('profiling-stopper-function-field').should('exist');

			cy.dataTest('profiling-trigger-function-field')
				.find('vscode-text-field')
				.shadow()
				.find('input')
				.type('start_trace');
			cy.dataTest('profiling-trigger-function-field')
				.find('vscode-text-field')
				.shadow()
				.find('input')
				.should('have.value', 'start_trace');

			cy.dataTest('profiling-stopper-function-field')
				.find('vscode-text-field')
				.shadow()
				.find('input')
				.type('stop_trace');
			cy.dataTest('profiling-stopper-function-field')
				.find('vscode-text-field')
				.shadow()
				.find('input')
				.should('have.value', 'stop_trace');

			cy.dataTest('profiling-trigger-function-field')
				.find('vscode-text-field')
				.shadow()
				.find('input')
				.should('have.value', 'start_trace');

			cy.get('#select-trace-interface-CM4-controlDropdown').click({
				force: true
			});
			cy.contains('USB').click({force: true});

			cy.get('#select-trace-interface-CM4-controlDropdown').should(
				'contain.text',
				'USB'
			);
			// USB needs neither a port nor a baud rate, so those fields are hidden.
			cy.dataTest('profiling-trace-interface-field').should(
				'not.exist'
			);
			cy.dataTest('profiling-baud-rate-field').should('not.exist');
		});
	});

	context('Conflict icon', () => {
		const projectId = baseCfsConfig.Projects[0].ProjectId;

		it('should show a conflict when the Zephelin baud rate is undefined', () => {
			const store = createTestStore();

			cy.mount(<TestComponent store={store} />);

			cy.dataTest('profiling-zephelin-config:CM4').within(() => {
				cy.dataTest('conflict-icon').should('not.exist');

				cy.get('header[role="button"]').click();

				cy.dataTest('enable-profiling-toggle-span').click();

				cy.dataTest('conflict-icon').should('exist');

				// The displayed value lives inside the VSCodeTextField's
				// shadow DOM, so it isn't picked up by `contain.text`.
				cy.dataTest('profiling-baud-rate-field')
					.find('vscode-text-field')
					.shadow()
					.find('input')
					.should('have.value', 'Undefined');

				cy.dataTest('profiling-baud-rate-field').should(
					'contain.text',
					l10n.cfgtools.profiling.interface['baud-rate-error']
				);
			});
		});

		it('should show a conflict when the memory usage profiling interval is below the minimum', () => {
			const store = createTestStore();

			store.dispatch(
				toggleProfilingEnabled({projectId, enabled: true})
			);
			store.dispatch(setInterface({projectId, interface: 'USB'}));
			store.dispatch(
				toggleMemoryUsageEnabled({projectId, enabled: true})
			);
			store.dispatch(
				setMemoryUsageInterval({
					projectId,
					interval: getMinProfilingMemoryInterval() - 1
				})
			);

			cy.mount(<TestComponent store={store} />);

			cy.dataTest('profiling-zephelin-config:CM4').within(() => {
				cy.dataTest('conflict-icon').should('exist');

				cy.get('header[role="button"]').click();

				cy.dataTest('profiling-memory-usage-interval-field').should(
					'contain.text',
					`the minimum value is ${getMinProfilingMemoryInterval()} ms`
				);
			});
		});

		it('should show a conflict when the CPU load profiling interval is below the minimum', () => {
			const store = createTestStore();

			store.dispatch(
				toggleProfilingEnabled({projectId, enabled: true})
			);
			store.dispatch(setInterface({projectId, interface: 'USB'}));
			store.dispatch(
				toggleCpuLoadEnabled({projectId, enabled: true})
			);
			store.dispatch(
				setCpuLoadInterval({
					projectId,
					interval: getMinCpuLoadInterval() - 1
				})
			);

			cy.mount(<TestComponent store={store} />);

			cy.dataTest('profiling-zephelin-config:CM4').within(() => {
				cy.dataTest('conflict-icon').should('exist');

				cy.get('header[role="button"]').click();

				cy.dataTest('profiling-cpu-load-interval-field').should(
					'contain.text',
					`the minimum value is ${getMinCpuLoadInterval()} ms`
				);
			});
		});
	});
});
