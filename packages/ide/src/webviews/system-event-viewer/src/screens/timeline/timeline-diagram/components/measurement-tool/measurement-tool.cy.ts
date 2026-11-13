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

import {createElement} from 'react';
import {configureStore} from '@reduxjs/toolkit';
import type {EChartsType} from 'echarts/core';
import {ColorsProvider} from '../../../../../common/context/colors-provider';
import {AppContent} from '../../../../../components/app-content/app-content';
import {navigationItems} from '../../../../../common/constants/navigation';
import {
	appContextReducer,
	setActiveScreen
} from '../../../../../state/slices/app-context/app-context.reducer';
import {eventSourcesReducer} from '../../../../../state/slices/event-sources/event-sources.reducer';
import {
	DIAGRAM_CHART_ROW_ID,
	DIAGRAM_CONTAINER_ID,
	INITIAL_DATA_ZOOM,
	MEASURE_PHASE,
	SNAP_RADIUS_X,
	SNAP_RADIUS_Y
} from '../../../../../common/constants/timeline';
import {
	setDataZoom,
	setMeasurePhase,
	timelineReducer
} from '../../../../../state/slices/timeline/timeline.reducer';
import {
	findNearestSnapCandidate,
	isMeasureModeActive,
	isPointInsideSnapCandidateArea,
	isPointWithinBounds,
	resolvePointFromBackground,
	resolvePointFromCandidate,
	resolveVisibleHorizontalLine
} from '../../../../../common/utils/measurement-tool';

const createTestStore = () =>
	configureStore({
		reducer: {
			appContextReducer,
			eventSourcesReducer,
			timelineReducer
		}
	});

type TestStore = ReturnType<typeof createTestStore>;

let testStore: TestStore;

const ROW1_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 1-0`;

function TestComponent() {
	return createElement(
		ColorsProvider,
		null,
		createElement(AppContent)
	);
}

const mountTimelineWithArmedMeasure = () => {
	testStore.dispatch(setActiveScreen(navigationItems.timeline));

	cy.mount(createElement(TestComponent), testStore);

	cy.dataTest('app-content:loading').should('not.exist');
	cy.dataTest(ROW1_TEST_ID).should('exist');

	cy.window().should(win => {
		const charts = (
			win as unknown as {
				__timelineEcharts: Map<string, EChartsType>;
			}
		).__timelineEcharts;

		expect(charts?.has('header'), 'header chart').to.equal(true);
		expect(
			charts?.has('Event Source Alias 1-0'),
			'first row chart'
		).to.equal(true);
	});

	cy.dataTest('top-bar-button:Measure').should('exist').click();
	cy.dataTest('timeline-diagram:measurement-overlay').should('exist');
};

const moveMouseOnRow = (rowTestId: string, xRatio: number) => {
	cy.dataTest(rowTestId).then($row => {
		const rowElement = $row[0];
		const rect = rowElement.getBoundingClientRect();

		cy.wrap($row).trigger('mousemove', {
			clientX: rect.left + rect.width * xRatio,
			clientY: rect.top + rect.height / 2,
			bubbles: true,
			force: true
		});
	});
};

const clickOnRow = (rowTestId: string, xRatio: number) => {
	cy.dataTest(rowTestId).then($row => {
		const rowElement = $row[0];
		const rect = rowElement.getBoundingClientRect();

		cy.wrap($row).trigger('click', {
			clientX: rect.left + rect.width * xRatio,
			clientY: rect.top + rect.height / 2,
			bubbles: true,
			force: true
		});
	});
};

const clickSnappedTimestamp = (timestamp: number) => {
	cy.window().then(win => {
		const charts = (
			win as unknown as {
				__timelineEcharts: Map<string, EChartsType>;
			}
		).__timelineEcharts;
		const chart = charts.get('Event Source Alias 1-0');

		expect(chart, 'first row chart').to.exist;

		const [x, y] = chart!.convertToPixel(
			{xAxisIndex: 0, yAxisIndex: 0},
			[timestamp, 0]
		) as [number, number];
		const chartElement = chart!.getDom();
		const canvas = chartElement.querySelector('canvas');

		expect(canvas, 'first row chart canvas').to.exist;

		const chartBounds = chartElement.getBoundingClientRect();

		for (const eventType of ['mousemove', 'click']) {
			canvas!.dispatchEvent(
				new win.MouseEvent(eventType, {
					bubbles: true,
					clientX: chartBounds.left + x,
					clientY: chartBounds.top + y
				})
			);
		}
	});
};

const clickOnRowEmptyBlock = (rowTestId: string, blockIndex = 0) => {
	cy.dataTest(rowTestId).then($row => {
		cy.wrap($row).within(() => {
			cy.dataTest('timeline-diagram:empty-block')
				.eq(blockIndex)
				.then($block => {
					const rect = $block[0].getBoundingClientRect();

					cy.wrap($block).click(
						Math.round(rect.width / 2),
						Math.round(rect.height / 2),
						{force: true}
					);
				});
		});
	});
};

const createFixedMeasurement = (
	startRatio = 0.35,
	endRatio = 0.65
) => {
	mountTimelineWithArmedMeasure();
	clickOnRow(ROW1_TEST_ID, startRatio);
	cy.dataTest('timeline-diagram:measurement-label:start').should(
		'exist'
	);

	clickOnRow(ROW1_TEST_ID, endRatio);
	cy.dataTest('timeline-diagram:measurement-label:end').should(
		'exist'
	);
};

const getMeasurementLeft = (dataTest: string) =>
	cy
		.dataTest(dataTest)
		.should('exist')
		.invoke('css', 'left')
		.then(left => Number.parseFloat(String(left)));

const captureMarkerPair = (): Cypress.Chainable<{
	start: number;
	end: number;
}> => {
	let start = 0;

	return getMeasurementLeft(
		'timeline-diagram:measurement-label:start'
	).then(startValue => {
		start = startValue;

		return getMeasurementLeft(
			'timeline-diagram:measurement-label:end'
		).then(endValue => ({start, end: endValue}));
	});
};

const getLabelText = (dataTest: string) =>
	cy
		.dataTest(dataTest)
		.should('exist')
		.invoke('text')
		.then(text => String(text).trim());

// Purpose for this function is to assert that the element is rendered within the viewport of the diagram and overlay;
// Fixes a false negative where Cypress finds the canva, but not the delta labels, because the overlay uses "ponter-events: none";
const assertRenderedInViewport = ($element: JQuery) => {
	const element = $element[0];
	const diagram = element.ownerDocument.getElementById(
		DIAGRAM_CONTAINER_ID
	);
	const overlay = element.closest(
		'[data-test="timeline-diagram:measurement-overlay"]'
	);

	const elementRect = element.getBoundingClientRect();
	const diagramRect = diagram!.getBoundingClientRect();
	const overlayRect = overlay!.getBoundingClientRect();
	const computedStyle =
		element.ownerDocument.defaultView?.getComputedStyle(element);
	const tolerance = 1;

	expect(computedStyle?.display).not.to.equal('none');
	expect(computedStyle?.visibility).not.to.equal('hidden');
	expect(Number(computedStyle?.opacity ?? 0)).to.be.greaterThan(0);
	expect(elementRect.width).to.be.greaterThan(0);
	expect(elementRect.height).to.be.greaterThan(0);
	expect(elementRect.left).to.be.at.least(
		Math.max(diagramRect.left, overlayRect.left) - tolerance
	);
	expect(elementRect.right).to.be.at.most(
		Math.min(diagramRect.right, overlayRect.right) + tolerance
	);
	expect(elementRect.top).to.be.at.least(
		Math.max(diagramRect.top, overlayRect.top) - tolerance
	);
	expect(elementRect.bottom).to.be.at.most(
		Math.min(diagramRect.bottom, overlayRect.bottom) + tolerance
	);
};

const captureCursorAndDeltaLabels = (): Cypress.Chainable<{
	cursor: string;
	delta: string;
}> => {
	let cursor = '';

	return getLabelText(
		'timeline-diagram:measurement-label:cursor'
	).then(cursorText => {
		cursor = cursorText;

		return getLabelText(
			'timeline-diagram:measurement-label:delta'
		).then(deltaText => ({cursor, delta: deltaText}));
	});
};

const triggerZoomInFromFooter = (times: number) => {
	for (let i = 0; i < times; i++) {
		cy.dataTest('timeline-diagram:footer:zoom-buttons:zoom-in')
			.should('exist')
			.should('not.be.disabled')
			.click();
	}
};

const hoverAndClickOnRowAtSamePosition = (
	rowTestId: string,
	xRatio: number
): Cypress.Chainable<string> =>
	cy.dataTest(rowTestId).then($row => {
		const rowElement = $row[0];
		const rect = rowElement.getBoundingClientRect();
		const clientX = rect.left + rect.width * xRatio;
		const clientY = rect.top + rect.height / 2;

		return cy
			.wrap($row)
			.trigger('mousemove', {
				clientX,
				clientY,
				bubbles: true,
				force: true
			})
			.then(() =>
				getLabelText('timeline-diagram:measurement-label:cursor')
			)
			.then(hoverCursorLabel =>
				cy
					.wrap($row)
					.trigger('click', {
						clientX,
						clientY,
						bubbles: true,
						force: true
					})
					.then(() => hoverCursorLabel)
			);
	});

const applyDataZoomFromRow = (start: number, end: number) => {
	cy.window().then(win => {
		const charts = (
			win as unknown as {
				__timelineEcharts: Map<string, EChartsType>;
			}
		).__timelineEcharts;
		const rowChart = charts.get('Event Source Alias 1-0');

		expect(rowChart, 'first row chart').to.exist;
		rowChart!.dispatchAction({type: 'dataZoom', start, end});
	});
};

const panDataZoom = (deltaPercent: number) => {
	cy.then(() => {
		const currentZoom = testStore.getState().timelineReducer.dataZoom;
		const start = Number(currentZoom.start);
		const end = Number(currentZoom.end);
		const width = end - start;
		const maxStart = 100 - width;
		const nextStart =
			start + deltaPercent <= maxStart
				? start + deltaPercent
				: Math.max(0, start - deltaPercent);

		applyDataZoomFromRow(nextStart, nextStart + width);
	});
};

const panDataZoomToEnd = () => {
	cy.then(() => {
		const currentZoom = testStore.getState().timelineReducer.dataZoom;
		const start = Number(currentZoom.start);
		const end = Number(currentZoom.end);
		const width = end - start;

		applyDataZoomFromRow(100 - width, 100);
	});
};

const triggerEscapeKey = () => {
	cy.window().then(win => {
		win.dispatchEvent(
			new win.KeyboardEvent('keydown', {
				key: 'Escape'
			})
		);
	});
};

describe('Measure tool', () => {
	it('Should detect whether measure mode is active', () => {
		expect(isMeasureModeActive(MEASURE_PHASE.IDLE)).to.equal(false);
		expect(isMeasureModeActive(MEASURE_PHASE.ARMED)).to.equal(true);
		expect(isMeasureModeActive(MEASURE_PHASE.MEASURING)).to.equal(
			true
		);
		expect(isMeasureModeActive(MEASURE_PHASE.FIXED)).to.equal(true);
	});

	it('Should validate point boundaries with inclusive edges', () => {
		expect(isPointWithinBounds({x: 0, y: 0}, 120, 80)).to.equal(true);
		expect(isPointWithinBounds({x: 120, y: 80}, 120, 80)).to.equal(
			true
		);
		expect(isPointWithinBounds({x: -1, y: 0}, 120, 80)).to.equal(
			false
		);
		expect(isPointWithinBounds({x: 121, y: 20}, 120, 80)).to.equal(
			false
		);
	});

	it('Should validate snap candidate area hit detection', () => {
		const candidate = {
			x: 200,
			y: 100,
			timestamp: 1,
			sourceId: 'event-0',
			eventIndex: 0
		};

		expect(
			isPointInsideSnapCandidateArea(
				{x: 200 + SNAP_RADIUS_X / 2, y: 100},
				candidate
			)
		).to.equal(true);
		expect(
			isPointInsideSnapCandidateArea(
				{x: 200 + SNAP_RADIUS_X / 2 + 1, y: 100},
				candidate
			)
		).to.equal(false);
	});

	it('Should return nearest snap candidate within snap radius', () => {
		const point = {x: 200, y: 100};
		const candidates = [
			{
				x: point.x + SNAP_RADIUS_X / 2,
				y: point.y,
				timestamp: 10,
				sourceId: 'event-0',
				eventIndex: 0
			},
			{
				x: point.x + SNAP_RADIUS_X / 4,
				y: point.y + SNAP_RADIUS_Y / 4,
				timestamp: 20,
				sourceId: 'event-1',
				eventIndex: 1
			}
		];

		const nearest = findNearestSnapCandidate(point, candidates);

		expect(nearest).to.deep.equal(candidates[1]);
	});

	it('Should return undefined when no snap candidates are in radius', () => {
		const point = {x: 200, y: 100};
		const candidates = [
			{
				x: point.x + SNAP_RADIUS_X / 2 + 1,
				y: point.y,
				timestamp: 10,
				sourceId: 'event-0',
				eventIndex: 0
			}
		];

		const nearest = findNearestSnapCandidate(point, candidates);

		expect(nearest).to.equal(undefined);
	});

	it('Should resolve snapped points without losing timestamp precision', () => {
		const candidate = {
			x: 25,
			y: 40,
			timestamp: 4.2056378,
			sourceId: 'event-3',
			eventIndex: 9
		};

		expect(resolvePointFromCandidate(candidate)).to.deep.equal({
			x: 25,
			y: 40,
			timestamp: 4.2056378,
			rawTicks: undefined,
			sourceId: 'event-3',
			eventIndex: 9,
			isSnapped: true
		});
	});

	it('Should resolve background points as non-snapped', () => {
		expect(
			resolvePointFromBackground({x: 50, y: 75}, 4.205637)
		).to.deep.equal({
			x: 50,
			y: 75,
			timestamp: 4.205637,
			isSnapped: false
		});
		expect(
			resolvePointFromBackground({x: 60, y: 80}, undefined)
		).to.deep.equal({
			x: 60,
			y: 80,
			timestamp: undefined,
			isSnapped: false
		});
	});

	it('Should preserve a horizontal line inside the viewport', () => {
		expect(
			resolveVisibleHorizontalLine(100, 300, 200, 800)
		).to.deep.equal({left: 100, width: 200});
	});

	it('Should clip an oversized horizontal line to the viewport', () => {
		expect(
			resolveVisibleHorizontalLine(-32_120_400, 32_120_400, 400, 800)
		).to.deep.equal({left: 0, width: 800});
	});
});

describe('Measurement flows', () => {
	beforeEach(() => {
		testStore = createTestStore();
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		testStore.dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
		testStore.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('should show overlay and cursor label in armed mode while moving mouse', () => {
		mountTimelineWithArmedMeasure();

		moveMouseOnRow(ROW1_TEST_ID, 0.7);

		cy.dataTest('timeline-diagram:measurement-label:cursor').should(
			'exist'
		);

		cy.dataTest('timeline-diagram:header-top-bar')
			.trigger('mousemove', 'center')
			.click('center');
		cy.dataTest('timeline-diagram:measurement-label:cursor').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'not.exist'
		);
	});

	it('should close the measurement tool when pressing ESC in armed mode', () => {
		mountTimelineWithArmedMeasure();

		triggerEscapeKey();

		cy.dataTest('timeline-diagram:measurement-overlay').should(
			'not.exist'
		);
		cy.then(() => {
			const {measurePhase} = testStore.getState().timelineReducer;

			expect(measurePhase).to.equal(MEASURE_PHASE.IDLE);
		});
	});

	it('should cancel in-progress measurement when pressing ESC in measuring mode', () => {
		mountTimelineWithArmedMeasure();

		clickOnRow(ROW1_TEST_ID, 0.35);

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);

		triggerEscapeKey();

		cy.dataTest('timeline-diagram:measurement-overlay').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'not.exist'
		);
		cy.then(() => {
			const {measurePhase} = testStore.getState().timelineReducer;

			expect(measurePhase).to.equal(MEASURE_PHASE.IDLE);
		});
	});

	it('should clear a fixed measurement when pressing ESC', () => {
		mountTimelineWithArmedMeasure();

		clickOnRow(ROW1_TEST_ID, 0.25);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);

		clickOnRow(ROW1_TEST_ID, 0.75);

		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);

		triggerEscapeKey();

		cy.dataTest('timeline-diagram:measurement-overlay').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'not.exist'
		);
		cy.then(() => {
			const {measurePhase} = testStore.getState().timelineReducer;

			expect(measurePhase).to.equal(MEASURE_PHASE.IDLE);
		});
	});

	it('should keep start marker hidden for background start selection', () => {
		mountTimelineWithArmedMeasure();

		clickOnRowEmptyBlock(ROW1_TEST_ID, 0);

		cy.then(() => {
			const {measurePhase} = testStore.getState().timelineReducer;

			expect(measurePhase).to.equal(MEASURE_PHASE.MEASURING);
		});

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);
	});

	it('should create fixed measurement with labels after two clicks', () => {
		mountTimelineWithArmedMeasure();

		clickOnRow(ROW1_TEST_ID, 0.25);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);

		clickOnRow(ROW1_TEST_ID, 0.75);

		cy.dataTest('timeline-diagram:measurement-label:end').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);
	});

	it('should create two background points in the header chart', () => {
		mountTimelineWithArmedMeasure();

		cy.dataTest('timeline-diagram:time-unit-chart').then(
			$headerChart => {
				const {width, height} =
					$headerChart[0].getBoundingClientRect();

				cy.dataTest('timeline-diagram:time-unit-chart').click(
					width / 4,
					height / 2
				);
				cy.dataTest(
					'timeline-diagram:measurement-label:start'
				).should('exist');

				cy.dataTest('timeline-diagram:time-unit-chart').click(
					(3 * width) / 4,
					height / 2
				);
			}
		);

		cy.dataTest('timeline-diagram:measurement-label:end').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:end').should(
			'not.exist'
		);

		cy.dataTest('timeline-diagram:time-unit-chart').then(
			timeChart => {
				const timeChartTop = timeChart[0].getBoundingClientRect().top;

				cy.dataTest('timeline-diagram:measurement-overlay').should(
					overlay => {
						expect(
							overlay[0].getBoundingClientRect().top
						).to.be.closeTo(timeChartTop, 1);
					}
				);
				cy.dataTest(
					'timeline-diagram:measurement-guide:start'
				).should(guide => {
					expect(guide[0].getBoundingClientRect().top).to.be.closeTo(
						timeChartTop,
						1
					);
				});
			}
		);
	});

	it('should render snapped markers behind the sticky header while scrolling', () => {
		mountTimelineWithArmedMeasure();

		clickSnappedTimestamp(0.6);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'exist'
		);

		clickSnappedTimestamp(1);
		cy.dataTest('timeline-diagram:measurement-point:end').should(
			'exist'
		);

		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '136px')
			.invoke('css', 'max-height', '136px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		cy.dataTest('timeline-diagram:measurement-point:start').then(
			marker => {
				const markerRect = marker[0].getBoundingClientRect();
				const markerCenterY = markerRect.top + markerRect.height / 2;

				cy.dataTest('timeline-diagram:time-unit-chart').then(
					chart => {
						const chartRect = chart[0].getBoundingClientRect();
						const chartCenterY = chartRect.top + chartRect.height / 2;

						cy.dataTest('timeline-diagram').scrollTo(
							0,
							markerCenterY - chartCenterY,
							{duration: 0}
						);
					}
				);
			}
		);

		cy.dataTest('timeline-diagram:time-unit-chart').then(chart => {
			const chartElement = chart[0];

			for (const point of ['start', 'end']) {
				cy.dataTest(
					`timeline-diagram:measurement-point:${point}`
				).should(marker => {
					const markerElement = marker[0];
					const markerRect = markerElement.getBoundingClientRect();
					const chartRect = chartElement.getBoundingClientRect();
					const markerCenter = {
						x: markerRect.left + markerRect.width / 2,
						y: markerRect.top + markerRect.height / 2
					};

					expect(markerCenter.y).to.be.within(
						chartRect.top,
						chartRect.bottom
					);

					markerElement.style.pointerEvents = 'auto';

					const topElement =
						markerElement.ownerDocument.elementFromPoint(
							markerCenter.x,
							markerCenter.y
						);

					expect(chartElement.contains(topElement)).to.equal(true);
					expect(markerElement.contains(topElement)).to.equal(false);
				});
			}
		});

		cy.dataTest('timeline-diagram:time-unit-chart').then(
			timeChart => {
				const timeChartTop = timeChart[0].getBoundingClientRect().top;

				cy.dataTest('timeline-diagram:measurement-overlay').should(
					overlay => {
						expect(
							overlay[0].getBoundingClientRect().top
						).to.be.closeTo(timeChartTop, 1);
					}
				);
			}
		);

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-guide:start').should(
			'exist'
		);

		cy.dataTest('timeline-diagram').scrollTo('top', {duration: 0});
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:end').should(
			'exist'
		);
	});

	it('should reset measurement after third click', () => {
		mountTimelineWithArmedMeasure();

		clickOnRow(ROW1_TEST_ID, 0.25);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);

		clickOnRow(ROW1_TEST_ID, 0.75);

		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);

		clickOnRow(ROW1_TEST_ID, 0.5);

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:end').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:end').should(
			'not.exist'
		);
	});
});

describe('Measurement zoom/pan', () => {
	beforeEach(() => {
		testStore = createTestStore();
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		testStore.dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
		testStore.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('should increase start-end marker separation after zoom in', () => {
		createFixedMeasurement(0.35, 0.65);

		captureMarkerPair().then(before => {
			const separationBefore = before.end - before.start;

			triggerZoomInFromFooter(2);

			captureMarkerPair().then(after => {
				const separationAfter = after.end - after.start;
				expect(separationAfter).to.be.greaterThan(separationBefore);
			});
		});
	});

	it('should preserve timestamp labels after zoom and pan', () => {
		createFixedMeasurement();

		getLabelText('timeline-diagram:measurement-label:start').then(
			startLabel => {
				getLabelText('timeline-diagram:measurement-label:end').then(
					endLabel => {
						triggerZoomInFromFooter(2);

						cy.dataTest(
							'timeline-diagram:measurement-label:start'
						).should('have.text', startLabel);
						cy.dataTest(
							'timeline-diagram:measurement-label:end'
						).should('have.text', endLabel);

						panDataZoom(5);

						cy.dataTest(
							'timeline-diagram:measurement-label:start'
						).should('have.text', startLabel);
						cy.dataTest(
							'timeline-diagram:measurement-label:end'
						).should('have.text', endLabel);
					}
				);
			}
		);
	});

	it('should keep measurement labels visible when panning right after zoom in', () => {
		createFixedMeasurement(0.45, 0.55);
		triggerZoomInFromFooter(4);
		panDataZoom(5);

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:end').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);
	});

	it('should show the same timestamp label when setting the start point', () => {
		mountTimelineWithArmedMeasure();
		triggerZoomInFromFooter(6);

		hoverAndClickOnRowAtSamePosition(ROW1_TEST_ID, 0.58).then(
			hoverCursorLabel => {
				cy.dataTest('timeline-diagram:measurement-label:start')
					.should('exist')
					.invoke('text')
					.then(text => String(text).trim())
					.should('equal', hoverCursorLabel);
			}
		);
	});

	it('should update cursor and delta labels while panning with a stationary cursor', () => {
		mountTimelineWithArmedMeasure();
		triggerZoomInFromFooter(6);

		clickOnRow(ROW1_TEST_ID, 0.42);
		moveMouseOnRow(ROW1_TEST_ID, 0.58);

		captureCursorAndDeltaLabels().then(before => {
			panDataZoom(20);

			cy.dataTest('timeline-diagram:measurement-label:cursor')
				.should('exist')
				.should($label => {
					const cursorAfter = String($label.text()).trim();

					expect(cursorAfter).not.to.equal(before.cursor);
				});

			cy.dataTest('timeline-diagram:measurement-label:delta')
				.should('exist')
				.should($label => {
					const deltaAfter = String($label.text()).trim();

					expect(deltaAfter).not.to.equal(before.delta);
				});
		});
	});

	it('should preserve start-before-end ordering after zoom and pan', () => {
		createFixedMeasurement(0.4, 0.6);
		triggerZoomInFromFooter(3);
		panDataZoom(3);

		captureMarkerPair().then(pair => {
			expect(pair.start).to.be.lessThan(pair.end);
		});
	});

	it('should keep delta label visible inside the overlay when both guide lines are panned off-screen', () => {
		createFixedMeasurement(0.1, 0.2);

		triggerZoomInFromFooter(8);
		panDataZoomToEnd();

		cy.dataTest('timeline-diagram:measurement-overlay').then(
			overlay => {
				const overlayRect = overlay[0].getBoundingClientRect();

				cy.dataTest(
					'timeline-diagram:measurement-guide:start'
				).should(guide => {
					const guideRect = guide[0].getBoundingClientRect();

					expect(guideRect.right).to.be.at.most(overlayRect.left);
				});
				cy.dataTest('timeline-diagram:measurement-guide:end').should(
					guide => {
						const guideRect = guide[0].getBoundingClientRect();

						expect(guideRect.right).to.be.at.most(overlayRect.left);
					}
				);
			}
		);

		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			assertRenderedInViewport
		);
		cy.dataTest('timeline-diagram:measurement-stem').should(
			assertRenderedInViewport
		);
	});
});
