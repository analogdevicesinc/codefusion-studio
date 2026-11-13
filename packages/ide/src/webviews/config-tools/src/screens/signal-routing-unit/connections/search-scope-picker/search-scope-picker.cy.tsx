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
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import SearchScopePicker from './search-scope-picker';
import {
	selectSruInput,
	setConnectionsFilter,
	setSelectedSignalGroup,
	setSignalAlias
} from '../../../../state/slices/sru/sru.reducer';
import {
	getSruDefaultConnections,
	getSruInputSignals
} from '../../../../utils/sru';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import l10n from '../../../../../../../../l10n/bundle.l10n.en.json';

const adsp21835 = (await import('@socs/adsp-21835-bga_ed.json').then(
	m => m.default
)) as Soc;

(window as any).__webview_localization_resources__ = l10n;

describe('SRU search scope picker component', () => {
	beforeEach(() => {
		cy.viewport(400, 600);
	});

	it('shows signal results for the signals scope', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(
			setConnectionsFilter({searchText: 'SRC0_CLK'})
		);

		cy.dataTest('filter-control:signals').click();

		cy.dataTest('search-result-SRC0_CLK_IP_I').should('exist');
	});

	it('shows the raw name as the title and the alias as the subtitle for an aliased signal result', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		reduxStore.dispatch(
			setSignalAlias({
				signalName: 'SRC0_CLK_IP_I',
				alias: 'My Signal Alias'
			})
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(
			setConnectionsFilter({searchText: 'SRC0_CLK_IP_I'})
		);

		cy.dataTest('filter-control:signals').click();

		cy.dataTest('search-result-SRC0_CLK_IP_I-My Signal Alias').should(
			'exist'
		);
		cy.dataTest('search-result-title').should(
			'have.text',
			'SRC0_CLK_IP_I'
		);
		cy.dataTest('search-result-subtitle').should(
			'have.text',
			'My Signal Alias'
		);
	});

	it('qualifies same-named signals from different peripherals with their owning peripheral, and resolves the clicked one', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(setConnectionsFilter({searchText: 'LOW'}));
		cy.dataTest('filter-control:signals').click();

		// DAI0 and DAI1 both define a "LOW" output. Each result must be
		// labeled with its owning peripheral so the two are distinguishable.
		cy.dataTest('search-result-DAI0 / LOW').should('exist');
		cy.dataTest('search-result-DAI1 / LOW').should('exist');

		cy.dataTest('search-result-DAI1 / LOW').click();

		cy.then(() => {
			expect(
				reduxStore.getState().sruReducer.selectedSignalGroupKey
			).to.equal('DAI1');
			expect(
				reduxStore.getState().sruReducer.editableConnections?.[0]
					.peripheralName
			).to.equal('DAI1');
			expect(
				reduxStore.getState().sruReducer.editableConnections?.[0]
					.output?.Name
			).to.equal('LOW');
		});
	});

	it('shows pin-buffer results for the pinBuffers scope', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(setConnectionsFilter({searchText: 'PB01'}));

		cy.dataTest('filter-control:pinBuffers').click();

		// The side panel's PB01 label is peripheral-relative and repeats
		// across DAI peripherals, so results title themselves with the
		// peripheral-prefixed name instead - no subtitle needed.
		cy.dataTest('search-result-DAI0_PB01').should('exist');
		cy.dataTest('search-result-DAI1_PB01').should('exist');
		cy.dataTest('search-result-DAI0_PB01')
			.find('[data-test="search-result-subtitle"]')
			.should('not.exist');
	});

	it('shows a pin-buffer navigation group in the pinBuffers scope', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(setConnectionsFilter({searchText: 'DAI0'}));
		cy.dataTest('filter-control:pinBuffers').click();
		cy.dataTest('search-result-DAI0').should('exist');
	});

	it('shows individual peripheral matches alongside their navigation group, captioned', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(setConnectionsFilter({searchText: 'SPORT'}));
		cy.dataTest('filter-control:peripherals').click();

		cy.dataTest('search-section-caption-Peripherals').should('exist');
		cy.dataTest('search-section-caption-Groups').should('exist');
		cy.dataTest('search-result-SPORT 0A').should('exist');
		cy.dataTest('search-result-SPORT').should('exist');
	});

	it('requests a group reveal without changing the main-panel selection', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(setSelectedSignalGroup('TIMER0'));
		reduxStore.dispatch(setConnectionsFilter({searchText: 'SPORT'}));
		cy.dataTest('filter-control:peripherals').click();
		cy.dataTest('search-result-SPORT').should('exist');
		cy.dataTest('search-result-SPORT').click();

		cy.then(() => {
			expect(
				reduxStore.getState().sruReducer.navigationGroupReveal
			).to.deep.equal({
				sectionKind: 'peripherals',
				group: 'SPORT',
				sequence: 1
			});
			expect(
				reduxStore.getState().sruReducer.selectedSignalGroupKey
			).to.equal('TIMER0');
			expect(
				reduxStore.getState().sruReducer.connectionsFilter.searchText
			).to.equal('');
		});
	});

	it('shows no results when nothing matches', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		const scopes = [
			'pinBuffers',
			'peripherals',
			'signals',
			'descriptions'
		];

		// Store a non-default scope so restoring it is distinguishable from
		// the Pin Buffers fallback.
		reduxStore.dispatch(
			setConnectionsFilter({searchText: 'SRC0_CLK'})
		);
		cy.dataTest('filter-control:signals').click();
		cy.dataTest('filter-control:signals').should(
			'have.attr',
			'appearance',
			'primary'
		);

		// Dispatches must run inside cy.then() so they stay in order with the
		// queued Cypress commands.
		cy.then(() => {
			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'UNKNOWN_SEARCH_TERM'})
			);
		});

		for (const scope of scopes) {
			cy.dataTest(`filter-control:${scope}`)
				.should('be.disabled')
				.and('have.attr', 'appearance', 'secondary');
		}

		cy.dataTest('no-results').should('exist');

		// The stored scope is kept, so it is selected again once results return.
		cy.then(() => {
			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'SRC0_CLK'})
			);
		});

		cy.dataTest('filter-control:signals').should(
			'have.attr',
			'appearance',
			'primary'
		);
		cy.dataTest('filter-control:pinBuffers').should(
			'have.attr',
			'appearance',
			'secondary'
		);
		cy.dataTest('no-results').should('not.exist');
	});

	it('selects a signal group and opens the detail panel after a signal result click', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(
			setConnectionsFilter({searchText: 'SRC0_CLK'})
		);
		cy.dataTest('filter-control:signals').click();
		cy.dataTest('search-result-SRC0_CLK_IP_I').click();

		cy.then(() => {
			expect(
				reduxStore.getState().sruReducer.selectedSignalGroupKey
			).to.equal('ASRC0:SRC 0');
			expect(
				reduxStore.getState().sruReducer.connectionsFilter.searchText
			).to.equal('');
			expect(
				reduxStore.getState().sruReducer.expandedSignals
			).to.include('SRC0_CLK_IP_I');
			expect(
				reduxStore.getState().sruReducer.editableConnections
			).to.have.length(1);
			expect(
				reduxStore.getState().sruReducer.editableConnections?.[0]
					.peripheralName
			).to.equal('ASRC0');
			expect(
				reduxStore.getState().sruReducer.editableConnections?.[0]
					.input?.Name
			).to.equal('SRC0_CLK_IP_I');
		});
	});

	it('clears the detail panel when a group-only search result is clicked', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<SearchScopePicker />
			</LocalizationProvider>,
			reduxStore
		);

		reduxStore.dispatch(
			selectSruInput({
				peripheralName: 'ASRC0',
				input: getSruInputSignals().SRC0_CLK_IP_I
			})
		);

		cy.then(() => {
			expect(
				reduxStore.getState().sruReducer.editableConnections
			).to.have.length(1);
		});

		reduxStore.dispatch(setConnectionsFilter({searchText: 'PB01'}));
		cy.dataTest('filter-control:pinBuffers').click();
		// Multiple DAI pin buffers share the PB01 label, so the selected key
		// must name the clicked row's owning peripheral and not just any
		// PB01 group.
		cy.dataTest('search-result-DAI0_PB01').click();

		cy.then(() => {
			expect(
				reduxStore.getState().sruReducer.selectedSignalGroupKey
			).to.equal('DAI0:DAI0_PB01');
			expect(
				reduxStore.getState().sruReducer.editableConnections
			).to.equal(undefined);
		});
	});

	it('setSelectedSignalGroup clears editableConnections', () => {
		const reduxStore = configurePreloadedStore(
			adsp21835,
			{} as CfsConfig
		);

		reduxStore.dispatch(
			selectSruInput({
				peripheralName: 'ASRC0',
				input: getSruInputSignals().SRC0_CLK_IP_I
			})
		);
		expect(
			reduxStore.getState().sruReducer.editableConnections
		).to.have.length(1);

		reduxStore.dispatch(setSelectedSignalGroup('ASRC0:SRC 0'));

		expect(
			reduxStore.getState().sruReducer.editableConnections
		).to.equal(undefined);
		expect(
			reduxStore.getState().sruReducer.selectedSignalGroupKey
		).to.equal('ASRC0:SRC 0');
	});

	describe('Descriptions scope', () => {
		const COMMENT = 'Route PCG A clock to the ASRC';

		function mountWithComment() {
			const reduxStore = configurePreloadedStore(adsp21835, {
				Sru: {
					UserDescriptions: {SRC0_CLK_IP_I: COMMENT}
				}
			} as unknown as CfsConfig);

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<SearchScopePicker />
				</LocalizationProvider>,
				reduxStore
			);

			return reduxStore;
		}

		it('shows a peripheral-description match with the signal group as context', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'GP Timer'})
			);
			cy.dataTest('filter-control:descriptions').click();

			cy.dataTest('search-result-GP Timer Interface-TIMER0').should(
				'exist'
			);
		});

		it('shows a connection-comment match with its output → input pair as context', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'Route PCG A'})
			);
			cy.dataTest('filter-control:descriptions').click();

			const output = getSruDefaultConnections().SRC0_CLK_IP_I;

			cy.dataTest(
				`search-result-${COMMENT}-${output} → SRC0_CLK_IP_I`
			).should('exist');
		});

		it('clicking a connection-comment match selects its group and opens the detail panel', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'Route PCG A'})
			);
			cy.dataTest('filter-control:descriptions').click();
			cy.dataTest(
				`search-result-${COMMENT}-${
					getSruDefaultConnections().SRC0_CLK_IP_I
				} → SRC0_CLK_IP_I`
			).click();

			cy.then(() => {
				expect(
					reduxStore.getState().sruReducer.selectedSignalGroupKey
				).to.equal('ASRC0:SRC 0');
				expect(
					reduxStore.getState().sruReducer.expandedSignals
				).to.include('SRC0_CLK_IP_I');
				expect(
					reduxStore.getState().sruReducer.editableConnections
				).to.have.length(1);
				expect(
					reduxStore.getState().sruReducer.editableConnections?.[0]
						.peripheralName
				).to.equal('ASRC0');
				expect(
					reduxStore.getState().sruReducer.editableConnections?.[0]
						.input?.Name
				).to.equal('SRC0_CLK_IP_I');
			});
		});

		it('shows a signal-description match with the signal name as context, uncaptioned when it is the only kind matched', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				setConnectionsFilter({
					searchText: 'Sample Rate Converter 0 Clock Input'
				})
			);
			cy.dataTest('filter-control:descriptions').click();

			cy.dataTest(
				'search-result-Sample Rate Converter 0 Clock Input Input-SRC0_CLK_IP_I'
			).should('exist');
			cy.dataTest(
				'search-section-caption-Signal Descriptions'
			).should('not.exist');
		});

		it('clicking a signal-description match selects its group and opens the detail panel', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				setConnectionsFilter({
					searchText: 'Sample Rate Converter 0 Clock Input'
				})
			);
			cy.dataTest('filter-control:descriptions').click();
			cy.dataTest(
				'search-result-Sample Rate Converter 0 Clock Input Input-SRC0_CLK_IP_I'
			).click();

			cy.then(() => {
				expect(
					reduxStore.getState().sruReducer.selectedSignalGroupKey
				).to.equal('ASRC0:SRC 0');
				expect(
					reduxStore.getState().sruReducer.connectionsFilter
						.searchText
				).to.equal('');
				expect(
					reduxStore.getState().sruReducer.expandedSignals
				).to.include('SRC0_CLK_IP_I');
				expect(
					reduxStore.getState().sruReducer.editableConnections
				).to.have.length(1);
				expect(
					reduxStore.getState().sruReducer.editableConnections?.[0]
						.peripheralName
				).to.equal('ASRC0');
				expect(
					reduxStore.getState().sruReducer.editableConnections?.[0]
						.input?.Name
				).to.equal('SRC0_CLK_IP_I');
			});
		});

		it('shows the applicable captions together when a query matches multiple kinds', () => {
			const reduxStore = configurePreloadedStore(adsp21835, {
				Sru: {
					UserDescriptions: {
						SRC0_CLK_IP_I: 'Custom note about Clock Input routing'
					}
				}
			} as unknown as CfsConfig);

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<SearchScopePicker />
				</LocalizationProvider>,
				reduxStore
			);

			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'Clock Input'})
			);
			cy.dataTest('filter-control:descriptions').click();

			cy.dataTest(
				'search-section-caption-Connection Descriptions'
			).should('exist');
			cy.dataTest(
				'search-section-caption-Signal Descriptions'
			).should('exist');
		});

		it('clicking a peripheral-description match selects its group and clears the detail panel', () => {
			const reduxStore = mountWithComment();

			reduxStore.dispatch(
				selectSruInput({
					peripheralName: 'ASRC0',
					input: getSruInputSignals().SRC0_CLK_IP_I
				})
			);

			reduxStore.dispatch(
				setConnectionsFilter({searchText: 'GP Timer'})
			);
			cy.dataTest('filter-control:descriptions').click();
			cy.dataTest('search-result-GP Timer Interface-TIMER0').click();

			cy.then(() => {
				expect(
					reduxStore.getState().sruReducer.selectedSignalGroupKey
				).to.equal('TIMER0');
				expect(
					reduxStore.getState().sruReducer.expandedSignals
				).to.deep.equal([]);
				expect(
					reduxStore.getState().sruReducer.editableConnections
				).to.equal(undefined);
			});
		});
	});
});
