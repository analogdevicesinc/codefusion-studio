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

import {configureStore} from '@reduxjs/toolkit';
import {AppContent} from '../../components/app-content/app-content';
import {navigationItems} from '../constants/navigation';
import {DIAGRAM_CHART_ROW_ID} from '../constants/timeline';
import {
	appContextReducer,
	setActiveScreen
} from '../../state/slices/app-context/app-context.reducer';
import {eventSourcesReducer} from '../../state/slices/event-sources/event-sources.reducer';
import {
	setDataZoom,
	setTimeMode,
	setTimeAvailability,
	timelineReducer
} from '../../state/slices/timeline/timeline.reducer';
import {
	computeTickInterval,
	configureTimeContext,
	formatAxisLabels,
	formatReferenceLabel,
	formatTimestampLabel,
	formatTimeDiff,
	getTickFormatter,
	prepareMeasurementValue
} from './time-mode-formatters';
import {
	decomposeAxisValue,
	getVisibleRange,
	splitValueAtScale
} from './axis-scale';
import {ColorsProvider} from '../context/colors-provider';
import type {EChartsType} from 'echarts';
import type {TimeMode} from './time-mode-formatters';

const RELATIVE_TIME_MODE: TimeMode = 'relative';
const ROW_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 1-0`;

const createTestStore = () =>
	configureStore({
		reducer: {
			appContextReducer,
			eventSourcesReducer,
			timelineReducer
		}
	});

type TestStore = ReturnType<typeof createTestStore>;

type AxisOptions = {
	axisLabel: {formatter: (value: number) => string};
};

function TestComponent() {
	return (
		<ColorsProvider>
			<AppContent />
		</ColorsProvider>
	);
}

const mountTimeline = (testStore: TestStore) => {
	testStore.dispatch(setActiveScreen(navigationItems.timeline));

	cy.mount(<TestComponent />, testStore);
	cy.dataTest('app-content:loading').should('not.exist');
	cy.dataTest('timeline-diagram:time-unit-chart').should('exist');
};

const clickOnRow = (xRatio: number) => {
	cy.dataTest(ROW_TEST_ID).then(row => {
		const rect = row[0].getBoundingClientRect();

		cy.wrap(row).click(
			Math.round(rect.width * xRatio),
			Math.round(rect.height / 2),
			{force: true}
		);
	});
};

const createFixedMeasurement = () => {
	cy.dataTest('top-bar-button:Measure').click();
	cy.dataTest('timeline-diagram:measurement-overlay').should('exist');

	clickOnRow(0.27);
	cy.dataTest('timeline-diagram:measurement-label:start').should(
		'exist'
	);

	clickOnRow(0.73);
	cy.dataTest('timeline-diagram:measurement-label:end').should(
		'exist'
	);
	cy.dataTest('timeline-diagram:measurement-label:delta').should(
		'exist'
	);
};

const selectClockTicks = () => {
	cy.then(() => {
		configureTimeContext({tickFrequency: 1000, tickEpoch: ''});
	});

	cy.dataTest('top-bar-button:Clock Ticks').click();
};

describe('axis-scale', () => {
	describe('getVisibleRange', () => {
		for (const {start, end, min, max} of [
			{start: 0, end: 100, min: 10, max: 30},
			{start: 25, end: 75, min: 15, max: 25},
			{start: 25, end: 25, min: 15, max: 15},
			{start: 75, end: 25, min: 25, max: 25},
			{start: -25, end: 125, min: 5, max: 35}
		]) {
			it(`Should preserve the visible range for zoom from ${start} to ${end}`, () => {
				expect(
					getVisibleRange({min: 10, max: 30}, {start, end})
				).to.deep.equal({min, max});
			});
		}

		it('Should preserve a single-timestamp range', () => {
			expect(
				getVisibleRange({min: 2, max: 2}, {start: 25, end: 75})
			).to.deep.equal({min: 2, max: 2});
		});
	});

	it('Should split values into a containing block and remainder', () => {
		expect(splitValueAtScale(123940, 1000)).to.deep.equal({
			wholeUnits: 123,
			blockStart: 123000,
			remainder: 940
		});
		expect(splitValueAtScale(124000, 1000)).to.deep.equal({
			wholeUnits: 124,
			blockStart: 124000,
			remainder: 0
		});
		expect(splitValueAtScale(0, 1000)).to.deep.equal({
			wholeUnits: 0,
			blockStart: 0,
			remainder: 0
		});
	});

	it('Should decompose values using caller-supplied scales and retain zero components', () => {
		expect(
			decomposeAxisValue(1_234_567_800, [1e9, 1e6, 1e3, 1])
		).to.deep.equal([1, 234, 567, 800]);
		expect(
			decomposeAxisValue(1_000_001_000, [1e9, 1e6, 1e3, 1])
		).to.deep.equal([1, 0, 1, 0]);
		expect(decomposeAxisValue(123940, [1000, 1])).to.deep.equal([
			123, 940
		]);
	});
});

describe('time-mode-formatters (relative)', () => {
	const range = {min: 0, max: 100};
	const visibleRanges = {
		s: {min: 0, max: 10},
		ms: {min: 0, max: 0.1},
		us: {min: 0, max: 0.0001},
		ns: {min: 0, max: 0.0000001}
	};

	it('Should derive both logged references from the visible left edge', () => {
		const loggedRange = {min: 0.0156205, max: 10};
		for (const {zoom, min, max, interval, reference} of [
			{
				zoom: {start: 19.288485490495596, end: 20.490928555203876},
				min: 1.9414560911735166,
				max: 2.061512570025422,
				interval: 0.02,
				reference: '1s'
			},
			{
				zoom: {start: 19.863552205684968, end: 19.867965664837325},
				min: 1.9988729343962077,
				max: 1.9993135909070565,
				interval: 0.0001,
				reference: '1s 998ms'
			}
		]) {
			const visibleRange = getVisibleRange(loggedRange, zoom);
			expect(visibleRange.min).to.be.closeTo(min, 1e-14);
			expect(visibleRange.max).to.be.closeTo(max, 1e-14);
			expect(
				computeTickInterval(visibleRange, RELATIVE_TIME_MODE)
			).to.equal(interval);
			expect(
				formatReferenceLabel(
					visibleRange.min,
					visibleRange,
					RELATIVE_TIME_MODE
				)
			).to.equal(reference);
		}
	});

	describe('reference flooring and tick rounding', () => {
		for (const {value, reference, tick} of [
			{value: 1.9999999996, reference: '1s 999ms 999µs', tick: '2s'},
			{value: 1.0009999996, reference: '1s 0ms 999µs', tick: '1ms'},
			{value: 1.0000009996, reference: '1s 0ms 0µs', tick: '1µs'}
		]) {
			it(`Should floor the reference but round the tick at ${value}s`, () => {
				const visibleRange = {min: value, max: value + 0.0000001};
				expect(
					formatReferenceLabel(
						value,
						visibleRange,
						RELATIVE_TIME_MODE
					)
				).to.equal(reference);
				expect(
					formatAxisLabels(value, visibleRange, RELATIVE_TIME_MODE)
				).to.equal(tick);
			});
		}
	});

	describe('formatAxisLabels', () => {
		for (const {visibleRange, values, labels} of [
			{
				visibleRange: visibleRanges.ms,
				values: [1.96, 1.98, 2, 2.02, 2.04, 2.06],
				labels: ['960ms', '980ms', '2s', '20ms', '40ms', '60ms']
			},
			{
				visibleRange: visibleRanges.us,
				values: [1.9989, 1.999, 1.9991, 1.9992, 1.9993],
				labels: ['900µs', '999ms', '100µs', '200µs', '300µs']
			},
			{
				visibleRange: visibleRanges.ns,
				values: [1.0000049, 1.000005, 1.0000051],
				labels: ['900ns', '5µs', '100ns']
			}
		]) {
			it(`Should format tick remainders for visible span ${visibleRange.max}`, () => {
				expect(
					values.map(value =>
						formatAxisLabels(value, visibleRange, RELATIVE_TIME_MODE)
					)
				).to.deep.equal(labels);
			});
		}

		it('Should retain seconds rounding and trim trailing decimal zeros', () => {
			expect(
				[0, 1.24, 1.26, 10, 65].map(value =>
					formatAxisLabels(value, visibleRanges.s, RELATIVE_TIME_MODE)
				)
			).to.deep.equal(['0s', '1.2s', '1.3s', '10s', '65s']);
		});

		it('Should promote zero components while preserving the axis origin label', () => {
			for (const visibleRange of Object.values(visibleRanges)) {
				expect(
					formatAxisLabels(0, visibleRange, RELATIVE_TIME_MODE)
				).to.equal('0s');
			}
			expect(
				formatAxisLabels(
					0.000001,
					visibleRanges.ns,
					RELATIVE_TIME_MODE
				)
			).to.equal('1µs');
			expect(
				formatAxisLabels(0.001, visibleRanges.ns, RELATIVE_TIME_MODE)
			).to.equal('1ms');
			expect(
				formatAxisLabels(2, visibleRanges.ns, RELATIVE_TIME_MODE)
			).to.equal('2s');
			expect(
				formatAxisLabels(1.0009, visibleRanges.ms, RELATIVE_TIME_MODE)
			).to.equal('1s');
			expect(
				formatAxisLabels(
					1.0010009,
					visibleRanges.us,
					RELATIVE_TIME_MODE
				)
			).to.equal('1ms');
		});
	});

	describe('formatReferenceLabel', () => {
		it('Should show the reference at seconds resolution', () => {
			expect(
				formatReferenceLabel(
					1.234567,
					visibleRanges.s,
					RELATIVE_TIME_MODE
				)
			).to.equal('1s');
		});

		for (const {resolution, left, label} of [
			{resolution: 'ms', left: 0.5, label: '0s'},
			{resolution: 'ms', left: 1.96, label: '1s'},
			{resolution: 'ms', left: 2.02, label: '2s'},
			{resolution: 'us', left: 0.000999, label: ''},
			{resolution: 'us', left: 0.001, label: '1ms'},
			{resolution: 'us', left: 0.9989, label: '998ms'},
			{resolution: 'us', left: 1, label: '1s 0ms'},
			{resolution: 'us', left: 1.9989, label: '1s 998ms'},
			{resolution: 'ns', left: 0.000000999, label: ''},
			{resolution: 'ns', left: 0.000001, label: '1µs'},
			{resolution: 'ns', left: 0.001, label: '1ms 0µs'},
			{resolution: 'ns', left: 1, label: '1s 0ms 0µs'},
			{resolution: 'ns', left: 1.000001, label: '1s 0ms 0µs'},
			{resolution: 'ns', left: 1.000001001, label: '1s 0ms 1µs'}
		] as const) {
			it(`Should preserve the ${resolution} reference at ${left}s`, () => {
				const visibleRange = {
					min: left,
					max: left + visibleRanges[resolution].max
				};
				expect(
					formatReferenceLabel(left, visibleRange, RELATIVE_TIME_MODE)
				).to.equal(label);
			});
		}
	});

	describe('axis options and scale selection', () => {
		for (const {resolution, interval, label} of [
			{resolution: 's', interval: 2, label: '1.2s'},
			{resolution: 'ms', interval: 0.02, label: '234ms'},
			{resolution: 'us', interval: 0.00002, label: '567µs'},
			{resolution: 'ns', interval: 0.0000001, label: '800ns'}
		] as const) {
			it(`Should preserve the ${resolution} tick interval and formatter`, () => {
				const visibleRange = visibleRanges[resolution];
				const format = getTickFormatter(
					range,
					visibleRange,
					RELATIVE_TIME_MODE
				);
				expect(
					computeTickInterval(visibleRange, RELATIVE_TIME_MODE)
				).to.equal(interval);
				expect(format.formatter(1.2345678)).to.equal(label);
			});
		}

		it('Should filter full-range bounds before rounding, allowing ticks outside the visible range', () => {
			for (const visibleRange of Object.values(visibleRanges)) {
				const {formatter} = getTickFormatter(
					{min: 1, max: 2},
					visibleRange,
					RELATIVE_TIME_MODE
				);
				expect(formatter(0.9999999999)).to.equal('');
				expect(formatter(2.0000000001)).to.equal('');
				expect(formatter(1)).to.equal('1s');
				expect(formatter(2)).to.equal('2s');
			}
		});

		it('Should choose boundary-aligned intervals from the visible span', () => {
			for (const {span, interval} of [
				{span: 20, interval: 5},
				{span: 10, interval: 2},
				{span: 4, interval: 1},
				{span: 2, interval: 0.5},
				{span: 1.6, interval: 0.2},
				{span: 0.4, interval: 0.1},
				{span: 0.1, interval: 0.02},
				{span: 0.0001, interval: 0.00002}
			]) {
				expect(
					computeTickInterval({min: 0, max: span}, RELATIVE_TIME_MODE)
				).to.equal(interval);
			}
		});

		it('Should use seconds resolution for nonpositive spans', () => {
			for (const max of [0, -1]) {
				expect(
					computeTickInterval({min: 0, max}, RELATIVE_TIME_MODE)
				).to.be.greaterThan(0);
				expect(
					formatAxisLabels(1.234, {min: 0, max}, RELATIVE_TIME_MODE)
				).to.equal('1.2s');
			}
		});
	});

	describe('measurement preparation', () => {
		it('Should use the visible span for measurement preparation', () => {
			const visibleRange = getVisibleRange(
				{min: 10, max: 13},
				{start: 25, end: 50}
			);

			expect(
				prepareMeasurementValue(
					10.8056378,
					visibleRange,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(10.805637);
		});
	});

	describe('timestamp and measurement formatting', () => {
		for (const {value, label} of [
			{value: 0, label: '0ns'},
			{value: 4.205, label: '4s 205ms'},
			{value: 4.205637, label: '4s 205ms 637µs'},
			{value: 1.000001, label: '1s 0ms 1µs'},
			{value: 0.000001, label: '1µs'},
			{value: 0.001000001, label: '1ms 0µs 1ns'},
			{value: 0.000000001, label: '1ns'},
			{value: 1.9999999996, label: '2s'}
		]) {
			it(`Should format the full timestamp ${value} as ${label}`, () => {
				expect(
					formatTimestampLabel(value, RELATIVE_TIME_MODE)
				).to.equal(label);
			});
		}

		it('Should prepare background values at one unit finer than the axis', () => {
			expect(
				prepareMeasurementValue(
					4.2056378,
					visibleRanges.s,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.205);
			expect(
				prepareMeasurementValue(
					4.2056378,
					visibleRanges.ms,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.205637);
			expect(
				prepareMeasurementValue(
					4.2056378,
					visibleRanges.us,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.2056378);
			expect(
				prepareMeasurementValue(
					4.2056378,
					visibleRanges.ns,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.2056378);
		});

		it('Should round to nanoseconds before discarding finer background digits', () => {
			expect(
				prepareMeasurementValue(
					4.2059999996,
					visibleRanges.s,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.206);
			expect(
				prepareMeasurementValue(
					4.2059999994,
					visibleRanges.s,
					RELATIVE_TIME_MODE
				)?.value
			).to.equal(4.205);
		});

		it('Should format stored background values without restoring discarded digits', () => {
			const storedValue = prepareMeasurementValue(
				4.205637,
				visibleRanges.s,
				RELATIVE_TIME_MODE
			);
			expect(storedValue?.value).to.equal(4.205);
			expect(
				formatTimestampLabel(storedValue, RELATIVE_TIME_MODE)
			).to.equal('4s 205ms');
			// Snapped event timestamps bypass preparation and retain their full precision.
			expect(
				formatTimestampLabel(4.205637, RELATIVE_TIME_MODE)
			).to.equal('4s 205ms 637µs');
		});

		for (const {start, end, label} of [
			{start: 4.2, end: 4.2003, label: '300µs'},
			{start: 4.2003, end: 4.201, label: '700µs'},
			{start: 4.2003, end: 4.2, label: '-300µs'},
			{start: 4.201, end: 4.2003, label: '-700µs'},
			{start: 1, end: 2.000001, label: '1s 0ms 1µs'},
			{start: 1, end: 1.000000001, label: '1ns'},
			{start: 4.2, end: 4.2, label: '0ns'}
		]) {
			it(`Should format the signed difference from ${start} to ${end}`, () => {
				expect(
					formatTimeDiff(start, end, RELATIVE_TIME_MODE)
				).to.equal(label);
			});
		}

		it('Should leave missing measurement values and labels undefined', () => {
			expect(
				prepareMeasurementValue(
					undefined,
					visibleRanges.s,
					RELATIVE_TIME_MODE
				)
			).to.equal(undefined);
			expect(
				formatTimestampLabel(undefined, RELATIVE_TIME_MODE)
			).to.equal(undefined);
			expect(
				formatTimeDiff(undefined, 1, RELATIVE_TIME_MODE)
			).to.equal(undefined);
			expect(
				formatTimeDiff(1, undefined, RELATIVE_TIME_MODE)
			).to.equal(undefined);
		});
	});
});

describe('time-mode-formatters (absolute)', () => {
	const epoch = new Date(2026, 4, 1, 9, 2, 44).toISOString();
	const configureEpoch = (tickEpoch: string | undefined = epoch) => {
		configureTimeContext({tickFrequency: 1e6, tickEpoch});
	};

	beforeEach(() => configureEpoch());
	afterEach(() => configureTimeContext({tickFrequency: 1}));

	for (const {left, span, interval, reference} of [
		{
			left: new Date(2026, 8, 30, 1, 0, 8),
			span: 35 * 86400,
			interval: 7 * 86400,
			reference: '30.09.2026'
		},
		{
			left: new Date(2026, 9, 19, 8, 42, 27),
			span: 20 * 3600,
			interval: 4 * 3600,
			reference: '19.10.2026 08:00:00'
		},
		{
			left: new Date(2026, 9, 19, 13, 48, 19),
			span: 150 * 60,
			interval: 30 * 60,
			reference: '19.10.2026 13:30:00'
		},
		{
			left: new Date(2026, 9, 19, 15, 46, 51),
			span: 25 * 60,
			interval: 5 * 60,
			reference: '19.10.2026 15:45:00'
		},
		{
			left: new Date(2026, 9, 19, 15, 50, 51),
			span: 150,
			interval: 30,
			reference: '19.10.2026 15:50:30'
		}
	]) {
		it(`Should floor ${left.toISOString()} to ${reference}`, () => {
			configureEpoch(left.toISOString());
			const range = {min: 0, max: span};
			expect(computeTickInterval(range, 'absolute')).to.equal(
				interval
			);
			expect(formatReferenceLabel(0, range, 'absolute')).to.equal(
				reference
			);
		});
	}

	it('Should switch precision at exact second, minute, hour, and day boundaries', () => {
		for (const {left, span, before, at} of [
			{
				left: new Date(2026, 9, 19, 15, 50, 30),
				span: 150,
				before: '19.10.2026 15:50:00',
				at: '19.10.2026 15:50:30'
			},
			{
				left: new Date(2026, 9, 19, 15, 50, 0),
				span: 5 * 60,
				before: '19.10.2026 15:49:00',
				at: '19.10.2026 15:50:00'
			},
			{
				left: new Date(2026, 9, 19, 16, 0, 0),
				span: 5 * 3600,
				before: '19.10.2026 15:00:00',
				at: '19.10.2026 16:00:00'
			},
			{
				left: new Date(2026, 9, 20, 0, 0, 0),
				span: 5 * 86400,
				before: '19.10.2026',
				at: '20.10.2026'
			}
		]) {
			configureEpoch(left.toISOString());
			const range = {min: -0.001, max: span - 0.001};
			expect(
				formatReferenceLabel(-0.001, range, 'absolute')
			).to.equal(before);
			expect(formatReferenceLabel(0, range, 'absolute')).to.equal(at);
		}
	});

	it('Should keep local calendar rollovers and reject invalid epochs', () => {
		configureEpoch(new Date(2026, 11, 31, 23, 59, 59).toISOString());
		const range = {min: 0, max: 5 * 86400};
		expect(formatReferenceLabel(0, range, 'absolute')).to.equal(
			'31.12.2026'
		);
		expect(formatReferenceLabel(2, range, 'absolute')).to.equal(
			'01.01.2027'
		);
		configureEpoch('invalid epoch');
		expect(formatReferenceLabel(0, range, 'absolute')).to.equal('');
	});

	for (const {range, reference, values, labels} of [
		{
			range: {min: 0, max: 8},
			reference: '01.05.2026 09:02:44',
			values: [0, 2, 4, 6, 8],
			labels: [
				'09:02:44',
				'09:02:46',
				'09:02:48',
				'09:02:50',
				'09:02:52'
			]
		},
		{
			range: {min: 4.99, max: 6.01},
			reference: '01.05.2026 09:02:48',
			values: [5, 5.2, 5.4, 5.6, 5.8, 6],
			labels: [
				'09:02:49',
				'200ms',
				'400ms',
				'600ms',
				'800ms',
				'09:02:50'
			]
		},
		{
			range: {min: 4.99999999, max: 5.0000004},
			reference: '01.05.2026 09:02:48 999ms 999\u00b5s',
			values: [5, 5.0000001, 5.0000002, 5.0000003, 5.0000004],
			labels: ['09:02:49', '100ns', '200ns', '300ns', '400ns']
		}
	]) {
		it(`Should format local references and aligned ticks for ${range.min} to ${range.max}`, () => {
			expect(
				formatReferenceLabel(range.min, range, 'absolute')
			).to.equal(reference);
			expect(
				values.map(value =>
					formatAxisLabels(value, range, 'absolute')
				)
			).to.deep.equal(labels);
		});
	}

	it('Should offset the grid by the fractional epoch without losing microseconds', () => {
		configureEpoch(epoch.replace('.000Z', '.318653Z'));
		const range = {min: 0, max: 1};
		expect(computeTickInterval(range, 'absolute')).to.equal(0.2);
		expect(
			[0.081347, 0.281347, 0.481347, 0.681347, 0.881347].map(value =>
				formatAxisLabels(value, range, 'absolute')
			)
		).to.deep.equal(['400ms', '600ms', '800ms', '09:02:45', '200ms']);
		expect(formatTimestampLabel(0, 'absolute')).to.equal(
			'01.05.2026 09:02:44 318ms 653\u00b5s'
		);
	});

	it('Should retain fine boundaries when the visible edge is already aligned', () => {
		const range = {min: 5.0000001, max: 5.0000005};
		expect(computeTickInterval(range, 'absolute')).to.equal(1e-7);
		expect(
			[0.0000008, 0.0000009, 0.000001, 0.0000011, 0.001].map(value =>
				formatAxisLabels(value, range, 'absolute')
			)
		).to.deep.equal(['800ns', '900ns', '1\u00b5s', '100ns', '1ms']);
	});

	it('Should include the new local date only at exact midnight', () => {
		configureEpoch(new Date(2026, 4, 1, 23, 59, 59).toISOString());
		const range = {min: 0.9999999, max: 1.0000003};
		expect(formatAxisLabels(1, range, 'absolute')).to.equal(
			'02.05.2026 00:00:00'
		);
		expect(formatAxisLabels(1.0000001, range, 'absolute')).to.equal(
			'100ns'
		);
		expect(formatTimeDiff(0.9999999, 1, 'absolute')).to.equal(
			'100ns'
		);
	});

	it('Should render equivalent ISO instants identically in the local timezone', () => {
		configureEpoch('2026-05-01T09:02:44.318653+01:00');
		const label = formatTimestampLabel(0, 'absolute');
		configureEpoch('2026-05-01T08:02:44.318653Z');
		expect(formatTimestampLabel(0, 'absolute')).to.equal(label);
	});

	it('Should prepare backgrounds but retain raw event precision and signed durations', () => {
		const range = {min: 0, max: 8};
		expect(
			prepareMeasurementValue(0.234567, range, 'absolute')?.value
		).to.equal(0.234);
		expect(formatTimestampLabel(0.234567, 'absolute')).to.equal(
			'01.05.2026 09:02:44 234ms 567\u00b5s'
		);
		expect(formatTimestampLabel(0, 'absolute', 234567)).to.equal(
			'01.05.2026 09:02:44 234ms 567\u00b5s'
		);
		expect(formatTimeDiff(1.2, 0, 'absolute')).to.equal('-1s 200ms');
		expect(formatTimeDiff(0, 0, 'absolute', 1, 2)).to.equal(
			'1\u00b5s'
		);
	});

	it('Should refresh ABS when epochs change, disappear, and return', () => {
		const range = {min: 0, max: 1};
		configureTimeContext({tickFrequency: 1e6});
		expect(formatAxisLabels(0, range, 'absolute')).to.equal('');
		expect(formatReferenceLabel(0, range, 'absolute')).to.equal('');
		expect(formatTimeDiff(0, 1, 'absolute')).to.equal('');
		expect(
			prepareMeasurementValue(0.123456, range, 'absolute')?.value
		).to.equal(0.123456);
		expect(formatTimestampLabel(undefined, 'absolute')).to.equal(
			undefined
		);
		configureEpoch();
		expect(formatTimestampLabel(0, 'absolute')).to.equal(
			'01.05.2026 09:02:44'
		);
		configureEpoch(new Date(2026, 4, 2, 10, 3, 45).toISOString());
		expect(formatTimestampLabel(0, 'absolute')).to.equal(
			'02.05.2026 10:03:45'
		);
		configureTimeContext({tickFrequency: 1e6, tickEpoch: ''});
		expect(formatTimestampLabel(0, 'absolute')).to.equal('');
		expect(formatReferenceLabel(0, range, 'absolute')).to.equal('');
		configureEpoch(epoch.replace('.000Z', '.318653Z'));
		expect(formatTimestampLabel(0, 'absolute')).to.equal(
			'01.05.2026 09:02:44 318ms 653\u00b5s'
		);
	});

	it('Should use updated frequency with the same epoch and retain zero raw counts', () => {
		configureTimeContext({tickFrequency: 1000, tickEpoch: epoch});
		expect(formatTimestampLabel(0, 'absolute', 1000)).to.equal(
			'01.05.2026 09:02:45'
		);
		configureTimeContext({tickFrequency: 2000, tickEpoch: epoch});
		expect(formatTimestampLabel(0, 'absolute', 1000)).to.equal(
			'01.05.2026 09:02:44 500ms'
		);
		expect(formatTimestampLabel(99, 'absolute', 0)).to.equal(
			'01.05.2026 09:02:44'
		);
		expect(
			formatTimestampLabel(
				0.5,
				'absolute',
				Number.MAX_SAFE_INTEGER + 1
			)
		).to.equal('01.05.2026 09:02:44 500ms');
		configureTimeContext({tickFrequency: 2.5, tickEpoch: epoch});
		expect(formatTimestampLabel(0.5, 'absolute', 1000)).to.equal(
			'01.05.2026 09:02:44 500ms'
		);
	});

	it('Should retain required zero fractions in fine-scale references', () => {
		expect(
			formatReferenceLabel(0, {min: 0, max: 1e-4}, 'absolute')
		).to.equal('01.05.2026 09:02:44 0ms');
		expect(
			formatReferenceLabel(0, {min: 0, max: 4e-7}, 'absolute')
		).to.equal('01.05.2026 09:02:44 0ms 0\u00b5s');
	});

	it('Should fall back to REL when ABS availability disappears', () => {
		const testStore = createTestStore();
		testStore.dispatch(setTimeAvailability({abs: true}));
		testStore.dispatch(setTimeMode('absolute'));
		expect(testStore.getState().timelineReducer.timeMode).to.equal(
			'absolute'
		);
		testStore.dispatch(setTimeAvailability({abs: false}));
		expect(testStore.getState().timelineReducer.timeMode).to.equal(
			'relative'
		);
		for (const tickEpoch of [undefined, '']) {
			configureTimeContext({tickFrequency: 1e6, tickEpoch});
			expect(formatTimestampLabel(0, 'absolute')).to.equal('');
			expect(
				formatReferenceLabel(0, {min: 0, max: 1}, 'absolute')
			).to.equal('');
		}
	});

	it('Should choose intervals for relative and clock scales', () => {
		expect(
			computeTickInterval({min: 1.234, max: 2.2}, 'relative')
		).to.equal(0.2);
		configureTimeContext({tickFrequency: 3});
		expect(computeTickInterval({min: 0, max: 1}, 'clock')).to.equal(
			1 / 3
		);
	});
});

describe('time-mode-formatters (clock ticks)', () => {
	let testStore: TestStore;

	beforeEach(() => {
		testStore = createTestStore();

		cy.viewport(1200, 800);
		mountTimeline(testStore);
	});

	afterEach(() => {
		configureTimeContext({tickFrequency: 1, tickEpoch: ''});
	});

	it('Should display the TICKS button', () => {
		cy.dataTest('top-bar-button:Clock Ticks')
			.should('exist')
			.should('have.text', 'TICKS');
	});

	it('Should use relative time by default', () => {
		cy.dataTest('top-bar-button:Relative Time').should('exist');
		cy.then(() => {
			expect(testStore.getState().timelineReducer.timeMode).to.equal(
				'relative'
			);
		});
	});

	it('Should show the clock reference and x-axis values in ticks', () => {
		cy.then(() => {
			configureTimeContext({tickFrequency: 1000, tickEpoch: ''});

			testStore.dispatch(setDataZoom({start: 10, end: 11}));
		});
		cy.dataTest('top-bar-button:Clock Ticks').click();

		cy.dataTest('event-source-list:time-reference').should(
			'have.text',
			'2000'
		);

		cy.dataTest('timeline-diagram:time-unit-chart').then(() => {
			cy.window().should(win => {
				const charts = (
					win as unknown as {
						__timelineEcharts: Map<string, EChartsType>;
					}
				).__timelineEcharts;
				const axis = charts.get('header')!.getOption()
					.xAxis as AxisOptions[];

				expect(
					[2.1, 2.15, 3].map(value =>
						axis[0].axisLabel
							.formatter(value)
							.replace(/^\{edge[01]\|([^}]*)\}$/, '$1')
					)
				).to.deep.equal(['+100', '+150', '3000']);
			});
		});
	});

	it('Should keep measurement points visible after switching to ticks', () => {
		createFixedMeasurement();
		selectClockTicks();

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:end').should(
			'exist'
		);
	});

	it('Should format measurement and delta labels as ticks', () => {
		createFixedMeasurement();
		selectClockTicks();

		cy.dataTest('timeline-diagram:measurement-label:start')
			.invoke('text')
			.should('match', /^\d+$/);
		cy.dataTest('timeline-diagram:measurement-label:end')
			.invoke('text')
			.should('match', /^\d+$/);
		cy.dataTest('timeline-diagram:measurement-label:delta')
			.invoke('text')
			.should('match', /^-?\d+$/);
	});
});
