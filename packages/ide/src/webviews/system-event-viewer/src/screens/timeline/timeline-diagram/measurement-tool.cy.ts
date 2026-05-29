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
import {store} from '../../../state/store';
import {AppContent} from '../../../components/app-content/app-content';
import {navigationItems} from '../../../common/constants/navigation';
import {setActiveScreen} from '../../../state/slices/app-context/app-context.reducer';
import {
	DIAGRAM_CHART_ROW_ID,
	INITIAL_DATA_ZOOM,
	MEASURE_PHASE,
	SNAP_RADIUS_X,
	SNAP_RADIUS_Y,
	UNITS_ID as UNITS
} from '../../../common/constants/timeline';
import {
	setDataZoom,
	setMeasurePhase
} from '../../../state/slices/timeline/timeline.reducer';
import {
	findNearestSnapCandidate,
	formatTimeDiff,
	formatTimestamp,
	isMeasureModeActive,
	isPointInsideHeaderStrip,
	isPointInsideSnapCandidateArea,
	isPointWithinBounds,
	resolvePointFromBackground,
	resolvePointFromCandidate
} from '../../../common/utils/measurement-tool';

const ROW1_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 1-0`;

const mountTimelineWithArmedMeasure = () => {
	store.dispatch(setActiveScreen(navigationItems.timeline));

	cy.mount(createElement(AppContent), store);

	cy.dataTest('app-content:loading').should('not.exist', {
		timeout: 10000
	});
	cy.dataTest(ROW1_TEST_ID).should('exist', {timeout: 10000});

	cy.dataTest('top-bar-button:Measure').should('exist').click();
	cy.dataTest('timeline-diagram:measurement-overlay').should(
		'exist',
		{
			timeout: 10000
		}
	);
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

		cy.wrap($row).click(
			Math.round(rect.width * xRatio),
			Math.round(rect.height / 2),
			{force: true}
		);
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
	clickOnRow(ROW1_TEST_ID, endRatio);

	cy.dataTest('timeline-diagram:measurement-label:start').should(
		'exist'
	);
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

const panDataZoom = (deltaPercent: number) => {
	cy.then(() => {
		const currentZoom = store.getState().timelineReducer.dataZoom;
		const start = Number(currentZoom.start);
		const end = Number(currentZoom.end);
		const width = end - start;
		const maxStart = 100 - width;
		const nextStart =
			start + deltaPercent <= maxStart
				? start + deltaPercent
				: Math.max(0, start - deltaPercent);

		store.dispatch(
			setDataZoom({start: nextStart, end: nextStart + width})
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

	it('Should validate header strip hit detection with inclusive edges', () => {
		expect(isPointInsideHeaderStrip({x: 0, y: 0}, 28)).to.equal(true);
		expect(isPointInsideHeaderStrip({x: 30, y: 28}, 28)).to.equal(
			true
		);
		expect(isPointInsideHeaderStrip({x: 10, y: 29}, 28)).to.equal(
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

	it('Should resolve snapped points from candidates', () => {
		const candidate = {
			x: 25,
			y: 40,
			timestamp: 123,
			sourceId: 'event-3',
			eventIndex: 9
		};

		expect(resolvePointFromCandidate(candidate)).to.deep.equal({
			x: 25,
			y: 40,
			timestamp: 123,
			sourceId: 'event-3',
			eventIndex: 9,
			isSnapped: true
		});
	});

	it('Should resolve background points as non-snapped', () => {
		expect(
			resolvePointFromBackground({x: 50, y: 75}, 456)
		).to.deep.equal({
			x: 50,
			y: 75,
			timestamp: 456,
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

	it('Should format timestamp labels using progressive zoom unit granularity', () => {
		const timestamp = 5.0011945;

		expect(formatTimestamp(timestamp, UNITS.S)).to.equal('5s 1ms');
		expect(formatTimestamp(timestamp, UNITS.MS)).to.equal(
			'5s 1ms 194µs'
		);
		expect(formatTimestamp(timestamp, UNITS.US)).to.equal(
			'5s 1ms 194µs 500ns'
		);
	});

	it('Should format signed time differences for horizontal label', () => {
		expect(formatTimeDiff(5.001194, 5.0014, UNITS.US)).to.equal(
			'206µs'
		);
		expect(formatTimeDiff(5.75, 5.05, UNITS.MS)).to.equal('-700ms');
		expect(formatTimeDiff(5, 6.250003, UNITS.MS)).to.equal(
			'1s 250ms 3µs'
		);
	});
});

describe('Measurement flows', () => {
	beforeEach(() => {
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		store.dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
		store.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('should show overlay and cursor label in armed mode while moving mouse', () => {
		mountTimelineWithArmedMeasure();

		moveMouseOnRow(ROW1_TEST_ID, 0.7);

		cy.dataTest('timeline-diagram:measurement-label:cursor').should(
			'exist'
		);
	});

	it('should keep start marker hidden for background start selection', () => {
		mountTimelineWithArmedMeasure();

		clickOnRowEmptyBlock(ROW1_TEST_ID, 0);

		cy.then(() => {
			const {measurePhase} = store.getState().timelineReducer;

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

	it('should reset measurement after third click', () => {
		mountTimelineWithArmedMeasure();

		clickOnRow(ROW1_TEST_ID, 0.25);
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
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		store.dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
		store.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
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
});
