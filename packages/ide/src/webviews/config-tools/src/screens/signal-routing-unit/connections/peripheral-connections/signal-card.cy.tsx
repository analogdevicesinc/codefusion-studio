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
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import type {Peripheral} from '@common/types/soc';
import type {SruConnectionEntry} from '../../../../state/slices/sru/sru.selector';
import type {SruSignalCard} from '../../../../utils/sru-signals';
import {initializeSruData} from '../../../../utils/sru';
import {SignalCard} from './signal-card';
import l10n from '../../../../../../../../l10n/bundle.l10n.en.json';

(window as any).__webview_localization_resources__ = l10n;

// Seeds the module-level SRU signal-ownership caches that `canRevealSruSignal`
// reads, mirroring what `sysPlannerDataInit` does for the real app. Without
// this, every connection row's counterpart name renders as plain text (never
// navigable) because the caches are empty.
function seedSruSignalOwnership() {
	const spt0: Peripheral = {
		Name: 'SPT0',
		Description: 'SPT0',
		Cores: [],
		Signals: [],
		ClockNode: '',
		SRU: {
			Inputs: [
				{
					Name: 'SPT0A_CLK_I',
					Description: 'SPT0A_CLK_I',
					SignalType: 'Clock Signals',
					Config: {}
				},
				{
					Name: 'SPT0B_CLK_I',
					Description: 'SPT0B_CLK_I',
					SignalType: 'Clock Signals',
					Config: {}
				},
				{
					Name: 'DAI0_PBEN01_I',
					Description: 'DAI0_PBEN01_I',
					SignalType: 'Clock Signals',
					Config: {},
					IsPinBufferEnable: true
				}
			],
			Outputs: [
				{
					Name: 'SPT0A_CLK_O',
					Description: 'SPT0A_CLK_O',
					SignalType: 'Clock Signals'
				},
				{
					Name: 'SPT0A_PBEN_O',
					Description: 'SPT0A_PBEN_O',
					SignalType: 'Clock Signals'
				}
			]
		}
	};

	// HIGH is declared by two peripherals, so `canRevealSruSignal` treats it
	// as ambiguous and it cannot be navigated to.
	const dai0: Peripheral = {
		Name: 'DAI0',
		Description: 'DAI0',
		Cores: [],
		Signals: [],
		ClockNode: '',
		SRU: {
			Inputs: [],
			Outputs: [
				{Name: 'HIGH', Description: 'HIGH', SignalType: 'Logic'}
			]
		}
	};
	const dai1: Peripheral = {
		Name: 'DAI1',
		Description: 'DAI1',
		Cores: [],
		Signals: [],
		ClockNode: '',
		SRU: {
			Inputs: [],
			Outputs: [
				{Name: 'HIGH', Description: 'HIGH', SignalType: 'Logic'}
			]
		}
	};

	initializeSruData([spt0, dai0, dai1]);
}

before(() => {
	seedSruSignalOwnership();
});

function inputCard(
	name: string,
	connections: SruConnectionEntry[],
	isPinBufferEnable = false,
	editable = true
): SruSignalCard {
	return {
		signal: {
			Name: name,
			Description: `${name} description`,
			SignalType: 'Clock Signals',
			Config: {},
			IsPinBufferEnable: isPinBufferEnable
		},
		direction: 'input',
		connections,
		editable
	};
}

function outputCard(
	name: string,
	connections: SruConnectionEntry[],
	editable = true
): SruSignalCard {
	return {
		signal: {
			Name: name,
			Description: `${name} description`,
			SignalType: 'Clock Signals'
		},
		direction: 'output',
		connections,
		editable
	};
}

function mountCard(
	card: SruSignalCard,
	isExpanded: boolean,
	alias?: string
) {
	const onToggle = cy.stub().as('onToggle');
	const onEdit = cy.stub().as('onEdit');
	const onDeleteConnection = cy.stub().as('onDeleteConnection');
	const onNavigateToSignal = cy.stub().as('onNavigateToSignal');

	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<SignalCard
				card={card}
				isExpanded={isExpanded}
				signalAlias={alias}
				onDeleteConnection={onDeleteConnection}
				onEdit={onEdit}
				onToggle={onToggle}
				onNavigateToSignal={onNavigateToSignal}
			/>
		</LocalizationProvider>
	);
}

describe('SignalCard', () => {
	it('names the signal and counts its single connection when collapsed', () => {
		mountCard(
			inputCard('SPT0A_CLK_I', [
				{
					input: 'SPT0A_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'default'
				}
			]),
			false
		);

		cy.dataTest('signal-card:SPT0A_CLK_I').should(
			'contain.text',
			'SPT0A_CLK_I'
		);
		cy.dataTest('signal-card:SPT0A_CLK_I:count').should(
			'have.text',
			'1 Connection'
		);
		cy.dataTest('signal-card:SPT0A_CLK_I:body').should('not.exist');
	});

	it('pluralizes the connection count', () => {
		mountCard(
			outputCard('SPT0A_CLK_O', [
				{
					input: 'SPT0A_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'default'
				},
				{
					input: 'SPT0B_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'modified'
				}
			]),
			false
		);

		cy.dataTest('signal-card:SPT0A_CLK_O:count').should(
			'have.text',
			'2 Connections'
		);
	});

	it('lists an input card connection as the output it is sourced from, badged Default', () => {
		mountCard(
			inputCard('SPT0A_CLK_I', [
				{
					input: 'SPT0A_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'default'
				}
			]),
			true
		);

		cy.dataTest('signal-card:SPT0A_CLK_I:body').should('exist');
		cy.dataTest('signal-connection:SPT0A_CLK_O')
			.should('contain.text', 'SPT0A_CLK_O')
			.and('contain.text', 'Default');
	});

	it('lists an output card connection as the input sourced from it, badged Modified', () => {
		mountCard(
			outputCard('SPT0A_CLK_O', [
				{
					input: 'SPT0B_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'modified'
				}
			]),
			true
		);

		cy.dataTest('signal-connection:SPT0B_CLK_I')
			.should('contain.text', 'SPT0B_CLK_I')
			.and('contain.text', 'Modified');
	});

	it('toggles through the callback when the header is activated', () => {
		mountCard(
			inputCard('SPT0A_CLK_I', [
				{
					input: 'SPT0A_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'default'
				}
			]),
			false
		);

		cy.dataTest('signal-card:SPT0A_CLK_I').click();

		cy.get('@onToggle').should('have.been.calledWith', 'SPT0A_CLK_I');
	});

	describe('alias', () => {
		it('shows the raw name as the primary label with the alias below', () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				false,
				'My Card Alias'
			);

			cy.dataTest('signal-card:SPT0A_CLK_I')
				.find('[data-test="signal-name"]')
				.should('have.text', 'SPT0A_CLK_I');
			cy.dataTest('signal-card:SPT0A_CLK_I')
				.find('[data-test="signal-alias"]')
				.should('have.text', 'My Card Alias');
		});

		it('falls back to the raw name when there is no alias', () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				false
			);

			cy.dataTest('signal-card:SPT0A_CLK_I').should(
				'contain.text',
				'SPT0A_CLK_I'
			);
			cy.dataTest('signal-card:SPT0A_CLK_I')
				.find('[data-test="signal-alias"]')
				.should('not.exist');
		});

		it('does not alias the connection row for the signal at the other end', () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true,
				'My Card Alias'
			);

			cy.dataTest('signal-connection:SPT0A_CLK_I')
				.should('contain.text', 'SPT0A_CLK_I')
				.and('contain.text', 'Default')
				.and('not.contain.text', 'My Card Alias');
		});

		it("shows the connected output's raw name as primary with its alias below, on an input card's connection row", () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default',
						outputAlias: 'Output Alias'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_O')
				.find('[data-test="signal-name"]')
				.should('have.text', 'SPT0A_CLK_O');
			cy.dataTest('signal-connection:SPT0A_CLK_O')
				.find('[data-test="signal-alias"]')
				.should('have.text', '- Output Alias');
		});

		it("shows the connected input's raw name as primary with its alias below, on an output card's connection row", () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default',
						inputAlias: 'Input Alias'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_I')
				.find('[data-test="signal-name"]')
				.should('have.text', 'SPT0A_CLK_I');
			cy.dataTest('signal-connection:SPT0A_CLK_I')
				.find('[data-test="signal-alias"]')
				.should('have.text', '- Input Alias');
		});
	});

	describe('unused signals', () => {
		it('reads Unused, offers no chevron and cannot be toggled', () => {
			mountCard(outputCard('SPT0A_PBEN_O', []), false);

			cy.dataTest('signal-card:SPT0A_PBEN_O:count').should(
				'have.text',
				'Unused'
			);
			cy.dataTest('signal-card:SPT0A_PBEN_O:chevron').should(
				'not.exist'
			);

			cy.dataTest('signal-card:SPT0A_PBEN_O').click();

			cy.get('@onToggle').should('not.have.been.called');
		});

		it('stays collapsed even when marked expanded', () => {
			mountCard(outputCard('SPT0A_PBEN_O', []), true);

			cy.dataTest('signal-card:SPT0A_PBEN_O:body').should(
				'not.exist'
			);
		});
	});

	it('renders a pin-buffer enable input as a regular input card', () => {
		mountCard(
			inputCard(
				'DAI0_PBEN01_I',
				[
					{
						input: 'DAI0_PBEN01_I',
						output: 'HIGH',
						status: 'default'
					}
				],
				true
			),
			false
		);

		cy.dataTest('signal-card:DAI0_PBEN01_I').should(
			'contain.text',
			'DAI0_PBEN01_I'
		);
		cy.dataTest('signal-card:DAI0_PBEN01_I:count').should(
			'have.text',
			'1 Connection'
		);
	});

	describe('edit button', () => {
		it('appears on input and output cards and calls onEdit with the card', () => {
			const input = inputCard('SPT0A_CLK_I', [
				{
					input: 'SPT0A_CLK_I',
					output: 'SPT0A_CLK_O',
					status: 'default'
				}
			]);
			mountCard(input, false);

			cy.dataTest('signal-card:SPT0A_CLK_I:edit-button').click();

			cy.get('@onEdit').should('have.been.calledWith', input);
		});

		it('appears on unused output cards', () => {
			const card = outputCard('SPT0A_PBEN_O', []);
			mountCard(card, false);

			cy.dataTest('signal-card:SPT0A_PBEN_O:edit-button').should(
				'exist'
			);
			cy.dataTest('signal-card:SPT0A_PBEN_O:edit-button').click();

			cy.get('@onEdit').should('have.been.calledWith', card);
		});

		it('does not toggle expand/collapse when clicked', () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				false
			);

			cy.dataTest('signal-card:SPT0A_CLK_I:edit-button').click();

			cy.get('@onEdit').should('have.been.calledOnce');
			cy.get('@onToggle').should('not.have.been.called');
		});

		it('is hidden when the card is not editable', () => {
			mountCard(inputCard('DAI0_PB01_I', [], false, false), false);

			cy.dataTest('signal-card:DAI0_PB01_I:edit-button').should(
				'not.exist'
			);
		});
	});

	describe('delete button', () => {
		it('appears on output card connection rows only', () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest(
				'signal-connection:SPT0A_CLK_I:delete-button'
			).should('exist');

			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest(
				'signal-connection:SPT0A_CLK_O:delete-button'
			).should('not.exist');
		});

		it('is enabled and calls onDeleteConnection for default connections', () => {
			const entry: SruConnectionEntry = {
				input: 'SPT0A_CLK_I',
				output: 'SPT0A_CLK_O',
				status: 'default'
			};

			mountCard(outputCard('SPT0A_CLK_O', [entry]), true);

			cy.dataTest(
				'signal-connection:SPT0A_CLK_I:delete-button'
			).should('not.have.attr', 'disabled');
			cy.dataTest(
				'signal-connection:SPT0A_CLK_I:delete-button'
			).click();

			cy.get('@onDeleteConnection').should(
				'have.been.calledWith',
				entry
			);
		});

		it('is disabled when the default connection is already LOW', () => {
			mountCard(
				outputCard('LOW', [
					{
						input: 'SPT0A_CLK_I',
						output: 'LOW',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest(
				'signal-connection:SPT0A_CLK_I:delete-button'
			).should('have.attr', 'disabled');
		});

		it('is enabled and calls onDeleteConnection for modified connections', () => {
			const entry: SruConnectionEntry = {
				input: 'SPT0B_CLK_I',
				output: 'SPT0A_CLK_O',
				status: 'modified'
			};

			mountCard(outputCard('SPT0A_CLK_O', [entry]), true);

			cy.dataTest(
				'signal-connection:SPT0B_CLK_I:delete-button'
			).should('not.have.attr', 'disabled');
			cy.dataTest(
				'signal-connection:SPT0B_CLK_I:delete-button'
			).click();

			cy.get('@onDeleteConnection').should(
				'have.been.calledWith',
				entry
			);
		});

		describe('tooltip', () => {
			// `force: true` because the "already LOW" case hovers a
			// disabled button, which Cypress blocks by default.
			function hover(dataTest: string) {
				cy.dataTest(dataTest)
					.trigger('mouseover', {force: true})
					.trigger('mousemove', {force: true})
					.trigger('mouseenter', {force: true});
			}

			it('reads "Remove" for a default (not LOW) connection', () => {
				mountCard(
					outputCard('SPT0A_CLK_O', [
						{
							input: 'SPT0A_CLK_I',
							output: 'SPT0A_CLK_O',
							status: 'default'
						}
					]),
					true
				);

				hover('signal-connection:SPT0A_CLK_I:delete-button');
				cy.contains('Remove').should('exist');
			});

			it('reads "Reset Source" for a modified connection', () => {
				mountCard(
					outputCard('SPT0A_CLK_O', [
						{
							input: 'SPT0B_CLK_I',
							output: 'SPT0A_CLK_O',
							status: 'modified'
						}
					]),
					true
				);

				hover('signal-connection:SPT0B_CLK_I:delete-button');
				cy.contains('Reset Source').should('exist');
			});

			it('reads the already-disconnected message when the default is LOW', () => {
				mountCard(
					outputCard('LOW', [
						{
							input: 'SPT0A_CLK_I',
							output: 'LOW',
							status: 'default'
						}
					]),
					true
				);

				hover('signal-connection:SPT0A_CLK_I:delete-button');
				cy.contains('already disconnected').should('exist');
			});
		});
	});

	describe('connection description', () => {
		it('renders the user-provided description below the connection row', () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default',
						description: 'Short description to help others.'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_I:description').should(
				'have.text',
				'Short description to help others.'
			);
		});

		it('omits the description line when no description is set', () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_I:description').should(
				'not.exist'
			);
		});

		it('renders the description on input card connection rows too', () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default',
						description: 'DAI 0 pin buffer.'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_O:description').should(
				'have.text',
				'DAI 0 pin buffer.'
			);
		});
	});

	describe('signal navigation', () => {
		it('calls onNavigateToSignal with the counterpart name when its link is clicked', () => {
			mountCard(
				inputCard('SPT0A_CLK_I', [
					{
						input: 'SPT0A_CLK_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:SPT0A_CLK_O')
				.find('[data-test="signal-name"]')
				.click();

			cy.get('@onNavigateToSignal').should(
				'have.been.calledWith',
				'SPT0A_CLK_O'
			);
		});

		it('renders an ambiguous counterpart name as plain text, not a link', () => {
			mountCard(
				inputCard(
					'DAI0_PBEN01_I',
					[
						{
							input: 'DAI0_PBEN01_I',
							output: 'HIGH',
							status: 'default'
						}
					],
					true
				),
				true
			);

			cy.dataTest('signal-connection:HIGH')
				.find('[data-test="signal-name"]')
				.should('match', 'span')
				.click();

			cy.get('@onNavigateToSignal').should('not.have.been.called');
		});

		it('renders a counterpart name unknown to the SoC as plain text, not a link', () => {
			mountCard(
				outputCard('SPT0A_CLK_O', [
					{
						input: 'UNKNOWN_SIGNAL_I',
						output: 'SPT0A_CLK_O',
						status: 'default'
					}
				]),
				true
			);

			cy.dataTest('signal-connection:UNKNOWN_SIGNAL_I')
				.find('[data-test="signal-name"]')
				.should('match', 'span')
				.click();

			cy.get('@onNavigateToSignal').should('not.have.been.called');
		});
	});
});
