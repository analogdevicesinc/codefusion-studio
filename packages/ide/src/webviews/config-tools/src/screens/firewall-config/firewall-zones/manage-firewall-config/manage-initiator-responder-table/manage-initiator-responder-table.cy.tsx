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

import type {Soc} from '../../../../../../../common/types/soc';
import {LocalizationProvider} from '../../../../../../../common/contexts/LocaleContext';
import {configurePreloadedStore} from '../../../../../state/store';
import {addFirewallZone} from '../../../../../state/slices/firewall/firewall.reducer';
import type {FirewallZone} from '../../../../../types/firewall';
import {
	INITIATOR_GROUP_NAME,
	SUPPORTED_MODE_LABELS
} from '../../../firewall-data';
import {
	initializeFirewallTestData,
	withFirewallTestData,
	FIREWALL_TEST_DATA
} from '../../../firewall-test-data';
import ManageInitiatorResponderTable from './manage-initiator-responder-table';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const ALL_INITIATOR_KEYS = FIREWALL_TEST_DATA.Initiators.map(
	initiator =>
		`initiators::${INITIATOR_GROUP_NAME}::${initiator.Name}`
);

const TABLE =
	'firewall-zones:manage-firewall-view:initiator-responder-table';

const createZoneWithSelections = (
	selectedFirewalls: string[]
): FirewallZone => ({
	id: 'zone-1',
	name: 'Test Zone',
	description: '',
	accessMode: 'open',
	accessModes: {
		nonSecureNonPrivileged: true,
		nonSecurePrivileged: true,
		secureNonPrivileged: true,
		securePrivileged: true
	},
	selectedFirewalls
});

type TestProps = {
	readonly initialColumn?: 'initiators' | 'responders';
	readonly searchQuery?: string;
	readonly isUnconfiguredActive?: boolean;
	readonly isConfiguredActive?: boolean;
	readonly selectedEntries?: string[];
	readonly onEntriesChange?: (
		keys: string[],
		selected: boolean
	) => void;
};

function TestManageInitiatorResponderTable({
	initialColumn = 'initiators',
	searchQuery = '',
	isUnconfiguredActive = false,
	isConfiguredActive = false,
	selectedEntries = [],
	onEntriesChange = () => undefined
}: TestProps) {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ManageInitiatorResponderTable
				initialColumn={initialColumn}
				searchQuery={searchQuery}
				isUnconfiguredActive={isUnconfiguredActive}
				isConfiguredActive={isConfiguredActive}
				selectedEntries={selectedEntries}
				onEntriesChange={onEntriesChange}
			/>
		</LocalizationProvider>
	);
}

describe('ManageInitiatorResponderTable', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the initiators tab with counts, select-all row and rows', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestManageInitiatorResponderTable />, reduxStore);

		cy.dataTest(TABLE).should('exist');
		cy.dataTest(`${TABLE}:tab-initiators`).should('exist');
		cy.dataTest(`${TABLE}:tab-responders`).should('exist');

		// The data model has no initiator groups, so all 9 sit in one group.
		cy.dataTest(`${TABLE}:count-initiators`).should(
			'contain.text',
			'9'
		);
		// Responders: M55_Itcm(4) + D2D_Dd_Mem(4) = 8
		cy.dataTest(`${TABLE}:count-responders`).should(
			'contain.text',
			'8'
		);

		cy.dataTest(`${TABLE}:select-all-row`).should('exist');
		cy.dataTest(`${TABLE}:select-all`).should('exist');
		cy.dataTest(`${TABLE}:unconfigured`).should(
			'contain.text',
			'UNCONFIGURED'
		);

		cy.contains(INITIATOR_GROUP_NAME).should('exist');
		cy.contains('dma_dde_0').should('exist');
		cy.contains('nss_nne').should('exist');
	});

	it('should render the responder rows when the responders tab is selected', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestManageInitiatorResponderTable />, reduxStore);

		cy.dataTest(`${TABLE}:tab-responders`).click();

		cy.contains('M55_Itcm').should('exist');
		cy.contains('dma_dde_0').should('not.exist');
	});

	it('should render the supported mode badges for a child entry', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestManageInitiatorResponderTable />, reduxStore);

		SUPPORTED_MODE_LABELS.forEach(mode => {
			cy.dataTest(
				`${TABLE}:mode-${INITIATOR_GROUP_NAME}-dma_dde_0-${mode}`
			)
				.should('exist')
				.and('contain.text', mode);
		});
	});

	it('should reflect the selected count badge and checkbox state for selected entries', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable
				selectedEntries={[
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`,
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`
				]}
			/>,
			reduxStore
		);

		cy.dataTest(
			`${TABLE}:selected-count-${INITIATOR_GROUP_NAME}`
		).should('contain.text', '2/9');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('have.attr', 'current-checked', 'true');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_2`
		).should('have.attr', 'current-checked', 'false');
	});

	it('should call onEntriesChange with a single key when a child is selected', () => {
		const onEntriesChange = cy.stub().as('onEntriesChange');
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable
				onEntriesChange={onEntriesChange}
			/>,
			reduxStore
		);

		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).click();

		cy.get('@onEntriesChange').should(
			'have.been.calledWith',
			[`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`],
			true
		);
	});

	it('should call onEntriesChange with all child keys when a group is selected', () => {
		const onEntriesChange = cy.stub().as('onEntriesChange');
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable
				onEntriesChange={onEntriesChange}
			/>,
			reduxStore
		);

		cy.dataTest(`${TABLE}:select-${INITIATOR_GROUP_NAME}`).click();

		cy.get('@onEntriesChange').should(
			'have.been.calledWith',
			ALL_INITIATOR_KEYS,
			true
		);
	});

	it('should call onEntriesChange with every visible key when select-all is clicked', () => {
		const onEntriesChange = cy.stub().as('onEntriesChange');
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable
				onEntriesChange={onEntriesChange}
			/>,
			reduxStore
		);

		cy.dataTest(`${TABLE}:select-all`).click();

		cy.get('@onEntriesChange').should(
			'have.been.calledWith',
			ALL_INITIATOR_KEYS,
			true
		);
	});

	it('should show the no-results empty state when the search matches nothing', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable searchQuery='ZZZ' />,
			reduxStore
		);

		cy.dataTest(`${TABLE}:no-results`).should('exist');
	});

	it('should filter the rows by a matching child name', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestManageInitiatorResponderTable searchQuery='nss' />,
			reduxStore
		);

		cy.contains('nss_nne').should('exist');
		cy.contains('dma_dde_0').should('not.exist');
		cy.dataTest(`${TABLE}:no-results`).should('not.exist');
	});

	it('should show only unconfigured children when the unconfigured filter is active', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(
			addFirewallZone(
				createZoneWithSelections([
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`,
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_3`
				])
			)
		);

		cy.mount(
			<TestManageInitiatorResponderTable isUnconfiguredActive />,
			reduxStore
		);

		// Entries dma_dde_1 and dma_dde_3 are configured (selected in a zone);
		// dma_dde_0 and dma_dde_2 remain unconfigured.
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_2`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_1`
		).should('not.exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_3`
		).should('not.exist');
	});
});
