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

import {DFGCanvas, to8DigitHex} from './dfg-canvas';
import type {Gasket} from '@common/types/soc';
import {
	configurePreloadedStore,
	type Store
} from '../../../state/store';
import type {CfsConfig, CfsSocDataModel, SocGasket} from 'cfs-types';
import styles from './dfg-canvas.module.scss';
import {addNewStream} from '../../../state/slices/gaskets/gasket.reducer';

const assOutputPhysicalConnectionSelector =
	'[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"]';
const assVerticalLineOutputSelector =
	'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-vertical-line-output"]';
const assHorizontalLineSelector =
	'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-horizontal-line"]';
const bssInputPhysicalConnectionSelector =
	'[data-test="gasket-section-BSS"] [data-test="gasket-input-physical-connection-1"]';
const gssHorizontalLineSelector =
	'[data-test="gasket-section-GSS"] [data-test="gasket-streams-to-bridge-horizontal-line"]';
const gssInputPhysicalConnectionSelector =
	'[data-test="gasket-section-GSS"] [data-test="gasket-input-physical-connection-1"]';
const essInputPhysicalConnectionSelector =
	'[data-test="gasket-section-ESS"] [data-test="gasket-input-physical-connection-2"]';
const fssInputPhysicalConnectionSelector =
	'[data-test="gasket-section-FSS"] [data-test="gasket-input-physical-connection-3"]';
const bssVerticalLineInputSelector =
	'[data-test="gasket-section-BSS"] [data-test="gasket-streams-to-bridge-vertical-line-input"]';
const gssVerticalLineInputSelector =
	'[data-test="gasket-section-GSS"] [data-test="gasket-streams-to-bridge-vertical-line-input"]';
const essVerticalLineInputSelector =
	'[data-test="gasket-section-ESS"] [data-test="gasket-streams-to-bridge-vertical-line-input"]';
const fssVerticalLineInputSelector =
	'[data-test="gasket-section-FSS"] [data-test="gasket-streams-to-bridge-vertical-line-input"]';

function addStream(
	reduxStore: Store,
	gasketA: Gasket,
	gasketB: Gasket
) {
	reduxStore.dispatch(
		addNewStream({
			StreamId: 0,
			Source: {
				Gasket: gasketA.Name,
				BufferSize: gasketA.OutputBufferSize / 2,
				Index: 0,
				BufferAddress: 0
			},
			Destinations: [
				{
					Gasket: gasketB.Name,
					BufferSize: gasketB.InputBufferSize / 2,
					Index: 0,
					BufferAddress: 0
				}
			],
			Group: '',
			Description: '',
			Uuid: `${Math.random()}-${Math.random()}`
		})
	);
}

function setupReduxStore(soc: CfsSocDataModel) {
	return configurePreloadedStore(soc, {} as CfsConfig);
}

function TestDFGCanvasComponent() {
	return (
		<div style={{background: 'black'}}>
			<DFGCanvas />
		</div>
	);
}

describe('DFG Canvas', () => {
	let gasketASS: SocGasket;
	let gasketBSS: SocGasket;
	let gasketESS: SocGasket;
	let gasketFSS: SocGasket;
	let gasketGSS: SocGasket;

	beforeEach(() => {
		cy.fixture('dfgtest-dfg.json')
			.as('soc')
			.then(soc => {
				gasketASS = soc.Gaskets.find(
					(gasket: {Name: string}) => gasket.Name === 'ASS'
				);
				gasketBSS = soc.Gaskets.find(
					(gasket: {Name: string}) => gasket.Name === 'BSS'
				);
				gasketESS = soc.Gaskets.find(
					(gasket: {Name: string}) => gasket.Name === 'ESS'
				);
				gasketFSS = soc.Gaskets.find(
					(gasket: {Name: string}) => gasket.Name === 'FSS'
				);
				gasketGSS = soc.Gaskets.find(
					(gasket: {Name: string}) => gasket.Name === 'GSS'
				);

				if (
					!gasketASS ||
					!gasketBSS ||
					!gasketESS ||
					!gasketFSS ||
					!gasketGSS
				) {
					throw new Error('Gaskets not found');
				}
			});
	});

	describe('General UI', () => {
		beforeEach(() => {
			cy.fixture('dfgtest-dfg.json').as('soc');
		});
		it('should render DFG canvas with 6 gaskets and a bridge', function () {
			const reduxStore = setupReduxStore(this.soc);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);

			cy.get(`.${styles.gasketSection}`).should('have.length', 6);
			cy.get(`.${styles.bridgeContainer}`).should('have.length', 1);
			cy.get(`.${styles.bridgeLabel}`).should(
				'have.text',
				'DFG Network-On-Chip'
			);
		});
	});

	describe('Gasket', () => {
		beforeEach(() => {
			cy.fixture('dfgtest-dfg.json').as('soc');
		});
		describe('Hover and selection behaviour', () => {
			beforeEach(() => {
				cy.fixture('dfgtest-dfg.json').as('soc');
			});
			it('should show an tooltip with text "Ammonite Subsystem" after 500ms when gasket ASS is hovered.', function () {
				const reduxStore = setupReduxStore(this.soc);
				cy.mount(<TestDFGCanvasComponent />, reduxStore);
				cy.get(`[data-test="gasket-box-${gasketASS.Name}"]`).trigger(
					'mouseover'
				);
				cy.wait(500);
				cy.get(`[data-test="gasket-box-tooltip"]`).should(
					'have.text',
					'Ammonite Subsystem'
				);
			});
			it('should highlight streams to and from a selected gasket, destination gaskets are not highlighted', function () {
				const reduxStore = setupReduxStore(this.soc);
				addStream(reduxStore, gasketASS, gasketBSS);
				addStream(reduxStore, gasketASS, gasketESS);
				addStream(reduxStore, gasketASS, gasketFSS);
				cy.mount(<TestDFGCanvasComponent />, reduxStore);
				cy.get(
					`[data-test="gasket-section-ASS"] [data-test="gasket-box-${gasketASS.Name}"]`
				).click();

				const testStreamPart = (selector: string) => {
					cy.get(selector).should('exist');
					cy.get(selector).should('have.class', styles.selected);
					cy.get(selector).should(
						'have.css',
						'border-color',
						'rgb(0, 127, 212)'
					);
					cy.get(selector).should(
						'have.css',
						`border-${selector.includes('input') ? 'top' : 'bottom'}-width`,
						'2px'
					);

					if (selector.includes('PhysicalConnection')) {
						// eslint-disable-next-line max-nested-callbacks
						cy.get(selector).then($el => {
							const beforeStyle = window.getComputedStyle(
								$el[0],
								'::before'
							);
							const borderLeftWidth = beforeStyle.getPropertyValue(
								'border-left-width'
							);
							expect(borderLeftWidth).to.equal('2px');
							const borderColor =
								beforeStyle.getPropertyValue('border-color');
							expect(borderColor).to.equal('rgb(0, 127, 212)');
						});
					}

					if (selector.includes('verticalLine')) {
						cy.get(selector).should(
							'have.css',
							'border-right-width',
							'2px'
						);
					}
				};

				testStreamPart(assOutputPhysicalConnectionSelector);
				testStreamPart(assVerticalLineOutputSelector);
				testStreamPart(assHorizontalLineSelector);
				testStreamPart(bssInputPhysicalConnectionSelector);
				testStreamPart(essInputPhysicalConnectionSelector);
				testStreamPart(fssInputPhysicalConnectionSelector);
				testStreamPart(bssVerticalLineInputSelector);
				testStreamPart(essVerticalLineInputSelector);
				testStreamPart(fssVerticalLineInputSelector);

				cy.get(`[data-test="gasket-box-ASS"]`).should(
					'have.class',
					styles.selected
				);
				cy.get(`[data-test="gasket-box-ASS"]`).should(
					'have.css',
					'border-color',
					'rgb(0, 127, 212)'
				);
				cy.get(`[data-test="gasket-box-BSS"]`).should(
					'not.have.class',
					styles.hovered
				);
				cy.get(`[data-test="gasket-box-BSS"]`).should(
					'have.css',
					'border-color',
					'rgb(69, 69, 69)'
				);
			});
		});

		describe('Gasket buffer size bars', () => {
			beforeEach(() => {
				cy.fixture('dfgtest-dfg.json').as('soc');
			});
			it('should have width attribute with value of 0% for gasket buffer size bars', function () {
				const reduxStore = setupReduxStore(this.soc);
				cy.mount(<TestDFGCanvasComponent />, reduxStore);
				cy.get(`[data-test="input-gasketBufferSizeBar"]`)
					.should('have.attr', 'style')
					.and('contain', 'width: 0%');
				cy.get(`[data-test="output-gasketBufferSizeBar"]`)
					.should('have.attr', 'style')
					.and('contain', 'width: 0%');
			});

			describe('Add one stream', () => {
				beforeEach(() => {
					cy.fixture('dfgtest-dfg.json').as('soc');
				});
				it('should show 1/8 for gasket ASS output and 1/2 for gasket BSS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="gasketStreamCount-output"]`
					).should('have.text', '1 / 8');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 2');
				});

				it('should have width 50% for gasket ASS output and 50% for gasket BSS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="output-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
				});
			});

			describe('Add two streams', () => {
				beforeEach(() => {
					cy.fixture('dfgtest-dfg.json').as('soc');
				});
				it('should show 2/8 for gasket ASS output, 1/2 for gasket BSS input and 1/16 for gasket ESS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					addStream(reduxStore, gasketASS, gasketESS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="gasketStreamCount-output"]`
					).should('have.text', '2 / 8');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 2');
					cy.get(
						`[data-test="gasket-section-ESS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 16');
				});

				it('should have width 100% for gasket ASS output and 50% for gasket BSS and ESS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					addStream(reduxStore, gasketASS, gasketESS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="output-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 100%');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
					cy.get(
						`[data-test="gasket-section-ESS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
				});
			});

			describe('Add three streams', () => {
				beforeEach(() => {
					cy.fixture('dfgtest-dfg.json').as('soc');
				});
				it('should show 3/8 for gasket ASS output, 1/2 for gasket BSS, 1/16 for gasket ESS input and 1/24 for gasket FSS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					addStream(reduxStore, gasketASS, gasketESS);
					addStream(reduxStore, gasketASS, gasketFSS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="gasketStreamCount-output"]`
					).should('have.text', '3 / 8');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 2');
					cy.get(
						`[data-test="gasket-section-ESS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 16');
					cy.get(
						`[data-test="gasket-section-FSS"] [data-test="gasketStreamCount-input"]`
					).should('have.text', '1 / 24');
				});

				it('should have width 100% for gasket ASS output and 50% for gasket DMA, ESS and FSS input', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					addStream(reduxStore, gasketASS, gasketESS);
					addStream(reduxStore, gasketASS, gasketFSS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					cy.get(
						`[data-test="gasket-section-ASS"] [data-test="output-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 100%');
					cy.get(
						`[data-test="gasket-section-BSS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
					cy.get(
						`[data-test="gasket-section-ESS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
					cy.get(
						`[data-test="gasket-section-FSS"] [data-test="input-gasketBufferSizeBar"]`
					)
						.should('have.attr', 'style')
						.and('contain', 'width: 50%');
				});

				it('should invalidate gasket ASS output buffer size bar', function () {
					const reduxStore = setupReduxStore(this.soc);
					addStream(reduxStore, gasketASS, gasketBSS);
					addStream(reduxStore, gasketASS, gasketESS);
					addStream(reduxStore, gasketASS, gasketFSS);
					cy.mount(<TestDFGCanvasComponent />, reduxStore);
					const outputBufferSizeBarSelector = `[data-test="gasket-section-ASS"] [data-test="output-gasketBufferSizeBar"]`;
					cy.get(outputBufferSizeBarSelector).should('exist');
					cy.get(outputBufferSizeBarSelector).should(
						'have.class',
						styles.invalid
					);
				});
			});
		});
	});

	describe('Stream', () => {
		beforeEach(() => {
			cy.fixture('dfgtest-dfg.json').as('soc');
		});
		it('should show a stream', function () {
			const reduxStore = setupReduxStore(this.soc);
			addStream(reduxStore, gasketASS, gasketGSS);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);

			cy.get(assOutputPhysicalConnectionSelector).should('exist');
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(assOutputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderLeftWidth = beforeStyle.getPropertyValue(
					'border-left-width'
				);
				expect(borderLeftWidth).to.equal('2px');
			});

			cy.get(assVerticalLineOutputSelector).should('exist');
			cy.get(assVerticalLineOutputSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(assVerticalLineOutputSelector).should(
				'have.css',
				'border-right-width',
				'2px'
			);

			cy.get(assHorizontalLineSelector).should('exist');
			cy.get(assHorizontalLineSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);

			cy.get(gssInputPhysicalConnectionSelector).should('exist');
			cy.get(gssInputPhysicalConnectionSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(gssInputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderLeftWidth = beforeStyle.getPropertyValue(
					'border-right-width'
				);
				expect(borderLeftWidth).to.equal('2px');
			});
			cy.get(gssVerticalLineInputSelector).should('exist');
			cy.get(gssVerticalLineInputSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(gssVerticalLineInputSelector).should(
				'have.css',
				'border-left-width',
				'2px'
			);
			cy.get(gssHorizontalLineSelector).should('exist');
			cy.get(gssHorizontalLineSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
		});
		it('should highlight a stream and the gaskets on hover', function () {
			const reduxStore = setupReduxStore(this.soc);
			addStream(reduxStore, gasketASS, gasketGSS);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);
			cy.get(
				`[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"]`
			).trigger('mouseover');

			cy.get(assOutputPhysicalConnectionSelector).should('exist');
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.class',
				styles.hovered
			);
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);
			cy.get(assOutputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderLeftWidth = beforeStyle.getPropertyValue(
					'border-left-width'
				);
				expect(borderLeftWidth).to.equal('2px');
				const borderColor =
					beforeStyle.getPropertyValue('border-color');
				expect(borderColor).to.equal('rgb(204, 204, 204)');
			});
			const verticalLineOutputSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-vertical-line-output"]';
			cy.get(verticalLineOutputSelector).should('exist');
			cy.get(verticalLineOutputSelector).should(
				'have.class',
				styles.hovered
			);
			cy.get(verticalLineOutputSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(verticalLineOutputSelector).should(
				'have.css',
				'border-right-width',
				'2px'
			);
			cy.get(verticalLineOutputSelector).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);

			const horizontalLineSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-horizontal-line"]';
			cy.get(horizontalLineSelector).should('exist');
			cy.get(horizontalLineSelector).should(
				'have.class',
				styles.hovered
			);
			cy.get(horizontalLineSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(horizontalLineSelector).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);

			const inputPhysicalConnectionSelector =
				'[data-test="gasket-section-GSS"] [data-test="gasket-input-physical-connection-1"]';
			cy.get(inputPhysicalConnectionSelector).should('exist');
			cy.get(inputPhysicalConnectionSelector).should(
				'have.class',
				styles.hovered
			);
			cy.get(inputPhysicalConnectionSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(inputPhysicalConnectionSelector).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);
			cy.get(inputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderRightWidth = beforeStyle.getPropertyValue(
					'border-right-width'
				);
				expect(borderRightWidth).to.equal('2px');
				const borderColor =
					beforeStyle.getPropertyValue('border-color');
				expect(borderColor).to.equal('rgb(204, 204, 204)');
			});

			const verticalLineInputSelector =
				'[data-test="gasket-section-GSS"] [data-test="gasket-streams-to-bridge-vertical-line-input"]';
			cy.get(verticalLineInputSelector).should('exist');
			cy.get(verticalLineInputSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(verticalLineInputSelector).should(
				'have.css',
				'border-left-width',
				'2px'
			);
			cy.get(verticalLineInputSelector).should(
				'have.class',
				styles.hovered
			);
			cy.get(verticalLineInputSelector).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);

			cy.get(`[data-test="gasket-box-ASS"]`).should(
				'have.class',
				styles.hovered
			);
			cy.get(`[data-test="gasket-box-ASS"]`).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);
			cy.get(`[data-test="gasket-box-GSS"]`).should(
				'have.class',
				styles.hovered
			);
			cy.get(`[data-test="gasket-box-GSS"]`).should(
				'have.css',
				'border-color',
				'rgb(204, 204, 204)'
			);
		});
		it('should show a tooltip when stream is hovered', function () {
			const reduxStore = setupReduxStore(this.soc);
			addStream(reduxStore, gasketASS, gasketBSS);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);
			cy.get(
				`[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"]`
			).trigger('mouseover');
			cy.wait(500);
			const tooltipSelector = `[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"] #stream-tooltip-gasket-connection-tooltip`;
			cy.get(tooltipSelector).should('exist');
			const headerSelector = `[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"] #stream-tooltip-gasket-connection-tooltip [data-test="tooltip-header"]`;
			cy.get(headerSelector).should('exist');
			cy.get(headerSelector).should(
				'have.text',
				'Stream #1 (ASS → BSS)'
			);
			const bodySelector = `[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"] #stream-tooltip-gasket-connection-tooltip [data-test="tooltip-body"]`;
			cy.get(bodySelector).should('exist');

			const stream = reduxStore.getState().gasketsReducer.Streams[0];
			const endAddress = to8DigitHex(
				stream.Source.BufferSize ? stream.Source.BufferSize - 1 : 0
			);
			cy.get(bodySelector).should(
				'have.text',
				`Start Buffer Address 0x00000000End Buffer Address ${endAddress}`
			);
		});
		it('should show a stream to self gasket', function () {
			const reduxStore = setupReduxStore(this.soc);
			addStream(reduxStore, gasketASS, gasketASS);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);
			const outputPhysicalConnectionSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-output-physical-connection-1"]';
			cy.get(outputPhysicalConnectionSelector).should('exist');
			cy.get(outputPhysicalConnectionSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(outputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderLeftWidth = beforeStyle.getPropertyValue(
					'border-left-width'
				);
				expect(borderLeftWidth).to.equal('2px');
			});
			const inputPhysicalConnectionSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-input-physical-connection-1"]';
			cy.get(inputPhysicalConnectionSelector).should('exist');
			cy.get(inputPhysicalConnectionSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(inputPhysicalConnectionSelector).then($el => {
				const beforeStyle = window.getComputedStyle(
					$el[0],
					'::before'
				);
				const borderLeftWidth = beforeStyle.getPropertyValue(
					'border-left-width'
				);
				expect(borderLeftWidth).to.equal('2px');
			});
			const verticalLineOutputSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-vertical-line-output"]';
			cy.get(verticalLineOutputSelector).should('exist');
			cy.get(verticalLineOutputSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(verticalLineOutputSelector).should(
				'have.css',
				'border-right-width',
				'2px'
			);
			const horizontalLineOutputSelector =
				'[data-test="gasket-section-ASS"] [data-test="gasket-streams-to-bridge-horizontal-line"]';
			cy.get(horizontalLineOutputSelector).should('exist');
			cy.get(horizontalLineOutputSelector).should(
				'not.have.class',
				styles.active
			);
		});
		it('should highlight a gasket when it is selected', function () {
			const reduxStore = setupReduxStore(this.soc);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);
			cy.get(
				`[data-test="gasket-section-ASS"] [data-test="gasket-box-ASS"]`
			).click();
			cy.get(
				`[data-test="gasket-section-ASS"] [data-test="gasket-box-ASS"]`
			).should('have.class', styles.selected);
			cy.get(
				`[data-test="gasket-section-ASS"] [data-test="gasket-box-ASS"]`
			).should('have.css', 'border-color', 'rgb(0, 127, 212)');
		});
		it('should highlight a stream and source and destination gaskets on click', function () {
			const reduxStore = setupReduxStore(this.soc);
			addStream(reduxStore, gasketASS, gasketGSS);
			cy.mount(<TestDFGCanvasComponent />, reduxStore);
			cy.get(assOutputPhysicalConnectionSelector).click();
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.class',
				styles.selected
			);
			cy.get(assOutputPhysicalConnectionSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(assVerticalLineOutputSelector).should(
				'have.class',
				styles.selected
			);
			cy.get(assVerticalLineOutputSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(assVerticalLineOutputSelector).should(
				'have.css',
				'border-right-width',
				'2px'
			);
			cy.get(assHorizontalLineSelector).should(
				'have.class',
				styles.selected
			);
			cy.get(assHorizontalLineSelector).should(
				'have.css',
				'border-bottom-width',
				'2px'
			);
			cy.get(gssInputPhysicalConnectionSelector).should(
				'have.class',
				styles.selected
			);
			cy.get(gssInputPhysicalConnectionSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(gssVerticalLineInputSelector).should(
				'have.class',
				styles.selected
			);
			cy.get(gssVerticalLineInputSelector).should(
				'have.css',
				'border-top-width',
				'2px'
			);
			cy.get(gssVerticalLineInputSelector).should(
				'have.css',
				'border-left-width',
				'2px'
			);
		});
	});

	describe('Tooltip Errors', () => {
		beforeEach(() => {
			cy.fixture('dfgtest-dfg.json').as('soc');
		});
		it('should show a tooltip with errors when stream has errors', function () {
			const reduxStore = setupReduxStore(this.soc);
			cy.mount(<TestDFGCanvasComponent />, reduxStore).then(() => {
				cy.wrap(
					reduxStore.dispatch(
						addNewStream({
							StreamId: 1,
							Description: 's1',
							Source: {
								Gasket: 'ASS',
								Index: 0,
								BufferSize: 100000,
								BufferAddress: 0
							},
							Destinations: [
								{
									Gasket: 'BSS',
									Index: 0,
									BufferSize: 1,
									BufferAddress: 0
								}
							],
							Group: '',
							Uuid: `${Math.random()}-${Math.random()}`
						})
					)
				).then(() => {
					cy.get(assOutputPhysicalConnectionSelector).trigger(
						'mouseover'
					);
					cy.wait(500);
					cy.get('[data-test="stream-tooltip-errors"]')
						.should('exist')
						.children()
						.should('have.length', 2);
					cy.get('[data-test="stream-tooltip-errors"]')
						.children()
						.eq(0)
						.should(
							'have.text',
							'Stream 1 has an invalid output buffer size of 100000 bytes at the ASS Gasket'
						);
					cy.get('[data-test="stream-tooltip-errors"]')
						.children()
						.eq(1)
						.should(
							'have.text',
							'Stream 1 has an invalid input buffer size of 1 bytes at the BSS Gasket'
						);

					// Hover over the gasket box
					cy.get(
						`[data-test="gasket-box-${gasketASS.Name}"]`
					).trigger('mouseover');
					cy.wait(500);
					cy.get('[data-test="gasket-tooltip-errors"]')
						.should('exist')
						.children()
						.should('have.length', 1);
					cy.get('[data-test="gasket-tooltip-errors"]')
						.children()
						.eq(0)
						.should(
							'have.text',
							"Gasket ASS uses 100000 bytes of output buffer space, which is greater than the gasket's capacity of 2048 bytes"
						);
				});
			});
		});
	});
});
