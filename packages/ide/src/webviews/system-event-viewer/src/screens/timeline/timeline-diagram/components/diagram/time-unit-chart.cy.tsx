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

import {useState} from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ColorsProvider} from '../../../../../common/context/colors-provider';
import {appContextReducer} from '../../../../../state/slices/app-context/app-context.reducer';
import {eventSourcesReducer} from '../../../../../state/slices/event-sources/event-sources.reducer';
import {
	setDataZoom,
	setTimeMode,
	timelineReducer
} from '../../../../../state/slices/timeline/timeline.reducer';
import type {
	DataZoom,
	HeaderChartHandle,
	Range
} from '../../../../../common/types/timeline';
import TimeReferenceBlock from './time-reference-block';
import {getVisibleRange} from '../../../../../common/utils/axis-scale';
import {readHeaderAxis} from '../../../../../common/test-utils/chart-axis';
import {getTimeAxisCoordinates} from '../../../../../common/utils/time-axis-utils';
import {configureTimeContext} from '../../../../../common/utils/time-mode-formatters';
import TimeUnitChart from './time-unit-chart';
import {useTimeMode} from '../../../../../state/slices/timeline/timeline.selector';

const createTestStore = () =>
	configureStore({
		reducer: {appContextReducer, eventSourcesReducer, timelineReducer}
	});

type HeaderExpectation = {
	reference: string;
	interval: number;
	values?: number[];
	labels?: string[];
};

const loggedRange = {min: 0.0156205, max: 10};
const millisecondZoom = {
	start: 19.288485490495596,
	end: 20.490928555203876
};
const microsecondZoom = {
	start: 19.863552205684968,
	end: 19.867965664837325
};

/** Mounts the real header and reference while allowing an in-place range update. */
function TestHeaderComponent({
	range,
	replacementRange,
	width,
	onReady,
	onUnregister
}: Readonly<{
	range: Range;
	replacementRange?: Range;
	width: number;
	onReady: (handle: HeaderChartHandle) => void;
	onUnregister: () => void;
}>) {
	const [timestampRange, setTimestampRange] = useState(range);
	const timeMode = useTimeMode();

	return (
		<div style={{width}}>
			<TimeReferenceBlock />
			<TimeUnitChart
				timestampRange={timestampRange}
				timeMode={timeMode}
				registerHeaderChart={onReady}
				unregisterHeaderChart={onUnregister}
			/>
			{replacementRange && (
				<button
					type='button'
					data-test='replace-timestamp-range'
					onClick={() => setTimestampRange(replacementRange)}
				>
					Replace range
				</button>
			)}
		</div>
	);
}

describe('Time Unit Chart', () => {
	let testStore: ReturnType<typeof createTestStore>;
	let headerChart: HeaderChartHandle | undefined;

	beforeEach(() => {
		testStore = createTestStore();
		headerChart = undefined;
		cy.viewport(1200, 800);
	});
	afterEach(() => configureTimeContext({tickFrequency: 1}));

	const mountHeader = (
		range = loggedRange,
		width = 1000,
		replacementRange?: Range
	) => {
		cy.mount(
			<ColorsProvider>
				<Provider store={testStore}>
					<TestHeaderComponent
						range={range}
						replacementRange={replacementRange}
						width={width}
						onReady={chart => {
							headerChart = chart;
						}}
						onUnregister={cy.stub().as('unregisterHeader')}
					/>
				</Provider>
			</ColorsProvider>
		);
	};

	// Redux changes exercise the real hook; chart-driven zoom is covered in timeline.cy.tsx.
	const changeZoom = (dataZoom: DataZoom) => {
		cy.then(() => {
			testStore.dispatch(setDataZoom(dataZoom));
		});
	};

	const assertHeader = ({
		reference,
		interval,
		values = [],
		labels = []
	}: HeaderExpectation) => {
		cy.dataTest('event-source-list:time-reference').should(
			'have.text',
			reference
		);

		cy.dataTest('timeline-diagram:time-unit-chart').should(() => {
			expect(headerChart, 'registered header chart').to.exist;

			const {axis, ticks: tickValues} = readHeaderAxis(
				headerChart!.chart
			);
			const mode = testStore.getState().timelineReducer.timeMode;
			const coordinates = getTimeAxisCoordinates(mode);
			const visibleRange = getVisibleRange(
				{min: axis.min, max: axis.max},
				testStore.getState().timelineReducer.dataZoom
			);
			expect(axis.minInterval).to.be.closeTo(
				interval,
				interval * 1e-8
			);
			expect(tickValues.length).to.be.greaterThan(1);
			const tolerance = Math.max(interval * 1e-6, 1e-10);
			tickValues.forEach((value, index) => {
				expect(value).to.be.at.least(visibleRange.min - tolerance);
				expect(value).to.be.at.most(visibleRange.max + tolerance);
				if (index > 0) {
					expect(value - tickValues[index - 1]).to.be.closeTo(
						interval,
						interval * 1e-8
					);
				}
			});
			expect(axis.axisLabel.showMinLabel).to.equal(
				Math.abs(tickValues[0] - visibleRange.min) <= tolerance
			);
			expect(axis.axisLabel.showMaxLabel).to.equal(
				Math.abs(
					tickValues[tickValues.length - 1] - visibleRange.max
				) <= tolerance
			);
			expect(
				values.map(value =>
					axis.axisLabel
						.formatter(coordinates.toAxis(value))
						.replace(/^\{edge[01]\|([^}]*)\}$/, '$1')
				)
			).to.deep.equal(labels);
			expect(axis.axisLabel.formatter(axis.min - 1)).to.equal('');
			expect(axis.axisLabel.formatter(axis.max + 1)).to.equal('');
			expect(
				testStore.getState().timelineReducer.referenceValue
			).to.equal(reference);
		});
	};

	for (const {instant, span, interval, reference} of [
		{
			instant: new Date(2026, 8, 30, 1, 0, 8),
			span: 35 * 86400,
			interval: 7 * 86400,
			reference: '30.09.2026'
		},
		{
			instant: new Date(2026, 9, 19, 8, 42, 27),
			span: 20 * 3600,
			interval: 4 * 3600,
			reference: '19.10.2026 08:00:00'
		},
		{
			instant: new Date(2026, 9, 19, 13, 48, 19),
			span: 150 * 60,
			interval: 30 * 60,
			reference: '19.10.2026 13:30:00'
		},
		{
			instant: new Date(2026, 9, 19, 15, 46, 51),
			span: 25 * 60,
			interval: 5 * 60,
			reference: '19.10.2026 15:45:00'
		},
		{
			instant: new Date(2026, 9, 19, 15, 50, 51),
			span: 150,
			interval: 30,
			reference: '19.10.2026 15:50:30'
		}
	]) {
		it(`Should format the ABS reference as ${reference}`, () => {
			configureTimeContext({
				tickFrequency: 1,
				tickEpoch: instant.toISOString()
			});
			testStore.dispatch(setTimeMode('absolute'));
			mountHeader({min: 0, max: span});
			assertHeader({reference, interval});
		});
	}

	it('Should keep the first and last ABS labels inside the chart', () => {
		configureTimeContext({
			tickFrequency: 1,
			tickEpoch: new Date(2026, 9, 20).toISOString()
		});
		testStore.dispatch(setTimeMode('absolute'));
		mountHeader({min: 0, max: 2 * 86400}, 500);

		cy.dataTest('timeline-diagram:time-unit-chart').should(() => {
			expect(headerChart, 'registered header chart').to.exist;
			const chart = headerChart!.chart;
			// Canvas text has no DOM bounds, so read the rendered text spans.
			const labels = chart
				.getZr()
				.storage.getDisplayList()
				.filter(element => element.type === 'tspan')
				.map(label => {
					const bounds = label.getBoundingRect().clone();
					bounds.applyTransform(label.getComputedTransform());
					return bounds;
				})
				.sort((a, b) => a.x - b.x);

			expect(labels.length).to.be.greaterThan(1);
			const first = labels[0];
			const last = labels[labels.length - 1];
			expect(first.x, 'first label left edge').to.be.at.least(0);
			expect(
				last.x + last.width,
				'last label right edge'
			).to.be.at.most(chart.getWidth());
		});
	});

	it('Should update the ABS reference on pan, reset, and range replacement', () => {
		configureTimeContext({
			tickFrequency: 1,
			tickEpoch: new Date(2026, 9, 19, 15, 46, 51).toISOString()
		});
		testStore.dispatch(setTimeMode('absolute'));
		mountHeader({min: 0, max: 1500}, 1000, {
			min: 780,
			max: 2280
		});
		assertHeader({reference: '19.10.2026 15:45:00', interval: 300});

		changeZoom({start: 60, end: 100});
		assertHeader({reference: '19.10.2026 16:00:00', interval: 120});

		changeZoom({start: 0, end: 100});
		assertHeader({reference: '19.10.2026 15:45:00', interval: 300});

		cy.dataTest('replace-timestamp-range').click();
		assertHeader({reference: '19.10.2026 15:55:00', interval: 300});
	});

	it('Should update both zoom examples and the reference on reset', () => {
		mountHeader();
		assertHeader({
			reference: '0s',
			interval: 2,
			values: [1.24, 1.26, 10],
			labels: ['1.2s', '1.3s', '10s']
		});

		changeZoom(millisecondZoom);
		assertHeader({
			reference: '1s',
			interval: 0.02,
			values: [1.96, 1.98, 2, 2.02, 2.04, 2.06],
			labels: ['960ms', '980ms', '2s', '20ms', '40ms', '60ms']
		});

		changeZoom(microsecondZoom);
		assertHeader({
			reference: '1s 998ms',
			interval: 0.0001,
			values: [1.9989, 1.999, 1.9991, 1.9992, 1.9993],
			labels: ['900µs', '999ms', '100µs', '200µs', '300µs']
		});

		changeZoom({start: 0, end: 100});
		assertHeader({
			reference: '0s',
			interval: 2,
			values: [2, 10],
			labels: ['2s', '10s']
		});
	});

	it('Should pan across a second boundary without changing the millisecond resolution', () => {
		mountHeader({min: 0, max: 4});
		changeZoom({start: 49, end: 52});
		assertHeader({
			reference: '1s',
			interval: 0.02,
			values: [1.98, 2, 2.02],
			labels: ['980ms', '2s', '20ms']
		});

		changeZoom({start: 51, end: 54});
		assertHeader({
			reference: '2s',
			interval: 0.02,
			values: [2.04, 2.06, 2.08],
			labels: ['40ms', '60ms', '80ms']
		});
	});

	it('Should update the reference while panning across a millisecond boundary', () => {
		mountHeader({min: 0, max: 4});
		changeZoom({start: 49.97, end: 49.98});
		assertHeader({
			reference: '1s 998ms',
			interval: 0.0001,
			values: [1.9989, 1.999, 1.9991],
			labels: ['900µs', '999ms', '100µs']
		});

		changeZoom({start: 49.98, end: 49.99});
		assertHeader({
			reference: '1s 999ms',
			interval: 0.0001,
			values: [1.9993, 1.9994, 1.9995],
			labels: ['300µs', '400µs', '500µs']
		});
	});

	it('Should retain zero reference components through microsecond and nanosecond zoom', () => {
		mountHeader({min: 0, max: 4});
		changeZoom({start: 25, end: 25.01});
		assertHeader({
			reference: '1s 0ms',
			interval: 0.0001,
			values: [1, 1.0001, 1.0002],
			labels: ['1s', '100µs', '200µs']
		});

		changeZoom({start: 25, end: 25.0000125});
		assertHeader({
			reference: '1s 0ms 0µs',
			interval: 0.0000001,
			values: [1, 1.0000001, 1.0000002],
			labels: ['1s', '100ns', '200ns']
		});

		changeZoom({start: 25, end: 75});
		assertHeader({
			reference: '1s',
			interval: 0.5,
			values: [1, 2],
			labels: ['1s', '2s']
		});
	});

	it('Should show the reference at full zoom for a subsecond range', () => {
		mountHeader({min: 0.001, max: 0.0014});
		assertHeader({
			reference: '1ms',
			interval: 0.0001,
			values: [0.001, 0.0011],
			labels: ['1ms', '100µs']
		});

		changeZoom({start: 0, end: 50});
		assertHeader({
			reference: '1ms',
			interval: 0.00005,
			values: [0.001, 0.0011],
			labels: ['1ms', '100µs']
		});
	});

	it('Should recalculate the reference and formatter when the range prop changes', () => {
		testStore.dispatch(setDataZoom({start: 25, end: 50}));
		mountHeader({min: 0, max: 2}, 1000, {min: 10, max: 12});
		assertHeader({
			reference: '0s',
			interval: 0.1,
			values: [0.5, 1],
			labels: ['500ms', '1s']
		});

		cy.dataTest('replace-timestamp-range').click();
		assertHeader({
			reference: '10s',
			interval: 0.1,
			values: [0.5, 10.5, 11],
			labels: ['', '500ms', '11s']
		});
		cy.dataTest('timeline-diagram:time-unit-chart').should(() => {
			const {axis} = readHeaderAxis(headerChart!.chart);
			expect(axis.min).to.equal(10);
			expect(axis.max).to.equal(12);
		});
	});

	for (const width of [500, 1100]) {
		it(`Should keep span-based unit selection in a ${width}px container`, () => {
			testStore.dispatch(setDataZoom({start: 25, end: 50}));
			mountHeader({min: 10, max: 13}, width);
			assertHeader({
				reference: '10s',
				interval: 0.1,
				values: [10.8, 11],
				labels: ['800ms', '11s']
			});
		});
	}
});
