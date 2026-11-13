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

import {configureStore} from '@reduxjs/toolkit';
import {
	appContextReducer,
	setActiveScreen
} from '../../state/slices/app-context/app-context.reducer';
import {eventSourcesReducer} from '../../state/slices/event-sources/event-sources.reducer';
import {
	setDataZoom,
	setTimeAvailability,
	timelineReducer
} from '../../state/slices/timeline/timeline.reducer';
import {AppContent} from '../../components/app-content/app-content';
import {ColorsProvider} from '../../common/context/colors-provider';
import {navigationItems} from '../../common/constants/navigation';
import {TIMESTAMPS} from '../../common/constants/mocked-event-sources';
import {
	DATA_TEST_E,
	DATA_TEST_S,
	DIAGRAM_CHART_ROW_ID,
	INITIAL_DATA_ZOOM,
	MEASURE_PHASE
} from '../../common/constants/timeline';
import type {EChartsType} from 'echarts';
import type {DataZoom} from '../../common/types/timeline';
import {getVisibleRange} from '../../common/utils/axis-scale';
import {readHeaderAxis} from '../../common/test-utils/chart-axis';
import {getTimeAxisCoordinates} from '../../common/utils/time-axis-utils';
import {configureTimeContext} from '../../common/utils/time-mode-formatters';

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
const ROW2_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 2-1`;
const ROW3_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 3-2`;

const chartKeyFromTestId = (testId: string) =>
	testId.replace(`${DIAGRAM_CHART_ROW_ID}:`, '');

const getXAxisOptions = (chartInstance: EChartsType) => {
	const option = chartInstance.getOption();

	return Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
};

const triggerZoomInFromFooter = (times: number) => {
	for (let i = 0; i < times; i++) {
		cy.dataTest('timeline-diagram:footer:zoom-buttons:zoom-in')
			.should('exist')
			.should('not.be.disabled')
			.then(() => {
				const previousStart =
					testStore.getState().timelineReducer.dataZoom.start;
				cy.dataTest(
					'timeline-diagram:footer:zoom-buttons:zoom-in'
				).click();
				cy.window().should(() => {
					expect(
						testStore.getState().timelineReducer.dataZoom.start
					).to.be.greaterThan(previousStart);
				});
			});
	}
};

const getDataZoom = (instance: any) => {
	const option = instance?.getOption?.();
	const dataZoom = option?.dataZoom?.[0];

	return dataZoom &&
		typeof dataZoom.start === 'number' &&
		typeof dataZoom.end === 'number'
		? {start: dataZoom.start, end: dataZoom.end}
		: null;
};

const waitForTimelineCharts = () => {
	const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
	const chart1Key = chartKeyFromTestId(ROW2_TEST_ID);
	const chart2Key = chartKeyFromTestId(ROW3_TEST_ID);

	return cy.window().should((win: any) => {
		const instMap = win.__timelineEcharts;

		expect(instMap?.has('header'), 'header chart').to.eq(true);
		expect(instMap?.has(chart0Key), 'chart0').to.eq(true);
		expect(instMap?.has(chart1Key), 'chart1').to.eq(true);
		expect(instMap?.has(chart2Key), 'chart2').to.eq(true);
	});
};

/** Sends a real row-chart event through the timeline's zoom synchronization. */
const zoomTimelineFromRow = (dataZoom: DataZoom) => {
	cy.window().then(win => {
		const charts = (
			win as unknown as {__timelineEcharts: Map<string, EChartsType>}
		).__timelineEcharts;

		const rowChart = charts.get(chartKeyFromTestId(ROW1_TEST_ID));
		expect(rowChart, 'originating row chart').to.exist;
		rowChart!.dispatchAction({type: 'dataZoom', ...dataZoom});
	});
};

/** Retries until chart options, zoom state, and the reference agree. */
const assertTimelineAxis = (
	dataZoom: DataZoom,
	reference: string,
	interval: number,
	values: number[],
	labels: string[]
) => {
	cy.dataTest('event-source-list:time-reference').should(
		'have.text',
		reference
	);
	cy.window().should(win => {
		const charts = (
			win as unknown as {__timelineEcharts: Map<string, EChartsType>}
		).__timelineEcharts;
		const keys = [ROW1_TEST_ID, ROW2_TEST_ID, ROW3_TEST_ID].map(
			chartKeyFromTestId
		);

		for (const key of ['header', ...keys]) {
			const chartZoom = getDataZoom(charts.get(key));
			expect(chartZoom, `${key} zoom`).not.to.equal(null);
			expect(chartZoom!.start, `${key} start`).to.be.closeTo(
				dataZoom.start,
				1e-9
			);
			expect(chartZoom!.end, `${key} end`).to.be.closeTo(
				dataZoom.end,
				1e-9
			);
		}

		const timeline = testStore.getState().timelineReducer;
		expect(timeline.dataZoom.start).to.be.closeTo(
			dataZoom.start,
			1e-9
		);
		expect(timeline.dataZoom.end).to.be.closeTo(dataZoom.end, 1e-9);
		expect(timeline.referenceValue).to.equal(reference);
		const {axis, ticks: tickValues} = readHeaderAxis(
			charts.get('header')!
		);
		const visibleRange = getVisibleRange(
			{min: axis.min, max: axis.max},
			dataZoom
		);
		const coordinates = getTimeAxisCoordinates(timeline.timeMode);
		expect(axis.minInterval).to.be.closeTo(interval, interval * 1e-8);
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
	});
};

function TestComponent() {
	return (
		<ColorsProvider>
			<AppContent />
		</ColorsProvider>
	);
}

describe('Timeline', () => {
	beforeEach(() => {
		testStore = createTestStore();
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		testStore.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
		configureTimeContext({tickFrequency: 1});
	});

	it('Should mount and display all the main sections', () => {
		testStore.dispatch(setActiveScreen(navigationItems.timeline));

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('timeline:container').should('exist');
		cy.dataTest('cfs-top-bar:container').should('exist');
		cy.dataTest('sev-header:cta-container').should('exist');
		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('event-sources:container').should('exist');
		cy.dataTest('timeline-diagram:time-unit-chart').should('exist');
		cy.dataTest(ROW1_TEST_ID).should('exist');
		cy.dataTest(ROW2_TEST_ID).should('exist');
		cy.dataTest(ROW3_TEST_ID).should('exist');
		cy.dataTest('timeline-diagram:footer').should('exist');
		cy.dataTest('timeline-diagram:footer:slider').should('exist');
		cy.dataTest('timeline-diagram:footer:zoom-buttons').should(
			'exist'
		);
	});

	it('Should disable ABS without an epoch and return to REL when it disappears', () => {
		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('top-bar-button:Absolute Time')
			.should('not.be.disabled')
			.click();
		cy.then(() => {
			expect(testStore.getState().timelineReducer.timeMode).to.equal(
				'absolute'
			);
			configureTimeContext({tickFrequency: 1, tickEpoch: ''});
			testStore.dispatch(setTimeAvailability({abs: false}));
		});
		cy.dataTest('top-bar-button:Absolute Time').should('be.disabled');
		cy.then(() => {
			expect(testStore.getState().timelineReducer.timeMode).to.equal(
				'relative'
			);
		});
	});

	it('Should sync dataZoom between charts', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('timeline-diagram:time-unit-chart').should('exist');
		cy.dataTest('timeline-diagram').should('exist');
		cy.dataTest('timeline-diagram:footer').should('exist');

		triggerZoomInFromFooter(3);

		// Assert exact dataZoom values across timestamp charts and header chart
		cy.window().should(win => {
			const chartInstanceMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;

			assert.exists(chartInstanceMap, '__timelineEcharts map exists');

			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart1Key = chartKeyFromTestId(ROW2_TEST_ID);
			const chart2Key = chartKeyFromTestId(ROW3_TEST_ID);

			const chart0 = chartInstanceMap.get(chart0Key);
			const chart1 = chartInstanceMap.get(chart1Key);
			const chart2 = chartInstanceMap.get(chart2Key);
			const header = chartInstanceMap.get('header');

			assert.exists(chart0, `${chart0Key} instance`);
			assert.exists(chart1, `${chart1Key} instance`);
			assert.exists(chart2, `${chart2Key} instance`);
			assert.exists(header, 'header chart instance');

			const dz0 = getDataZoom(chart0);
			const dz1 = getDataZoom(chart1);
			const dz2 = getDataZoom(chart2);
			const dzHeader = getDataZoom(header);

			assert.isNotNull(dz0, 'chart0 dataZoom');
			assert.isNotNull(dzHeader, 'header dataZoom');

			assert.isAbove(dz0!.start, 0, 'zoom start > 0');
			assert.isBelow(dz0!.end, 100, 'zoom end < 100');

			expect(dz0?.start).to.be.closeTo(24.4, 1e-9);
			expect(dz0?.end).to.be.closeTo(75.6, 1e-9);

			for (const [name, zoom] of [
				['chart1', dz1],
				['chart2', dz2],
				['header', dzHeader]
			] as const) {
				expect(zoom?.start, `${name} start`).to.be.closeTo(
					dz0!.start,
					1e-9
				);
				expect(zoom?.end, `${name} end`).to.be.closeTo(
					dz0!.end,
					1e-9
				);
			}
		});
	});

	it('Should synchronize zoom, rollover labels, and reference value', () => {
		cy.mount(<TestComponent />, testStore);
		waitForTimelineCharts();

		// Nonzero range [0.1, 20]
		const msDataZoom = {start: 9.3, end: 9.9};
		zoomTimelineFromRow(msDataZoom);
		assertTimelineAxis(
			msDataZoom,
			'1s',
			0.02,
			[1.96, 1.98, 2, 2.02, 2.04, 2.06],
			['960ms', '980ms', '2s', '20ms', '40ms', '60ms']
		);

		const usDataZoom = {start: 9.542, end: 9.544};
		zoomTimelineFromRow(usDataZoom);
		assertTimelineAxis(
			usDataZoom,
			'1s 998ms',
			0.0001,
			[1.9989, 1.999, 1.9991, 1.9992],
			['900µs', '999ms', '100µs', '200µs']
		);

		zoomTimelineFromRow({start: 0, end: 100});
		assertTimelineAxis(
			{start: 0, end: 100},
			'0s',
			5,
			[0.1, 2, 20],
			['0.1s', '2s', '20s']
		);
	});

	it('Should synchronize pan across a reference boundary', () => {
		cy.mount(<TestComponent />, testStore);
		waitForTimelineCharts();

		const beforeBoundary = {start: 9.3, end: 9.9};
		zoomTimelineFromRow(beforeBoundary);
		assertTimelineAxis(
			beforeBoundary,
			'1s',
			0.02,
			[1.98, 2, 2.02],
			['980ms', '2s', '20ms']
		);

		const afterBoundary = {start: 9.8, end: 10.4};
		zoomTimelineFromRow(afterBoundary);
		assertTimelineAxis(
			afterBoundary,
			'2s',
			0.02,
			[2.06, 2.08, 2.1],
			['60ms', '80ms', '100ms']
		);
	});

	it('Should prevent zooming in when ctrl key is not pressed', () => {
		cy.mount(<TestComponent />, testStore);

		waitForTimelineCharts();

		cy.dataTest('app-content:loading').should('not.exist');

		let chartKeys: string[];

		cy.window().then(win => {
			chartKeys = [
				chartKeyFromTestId(ROW1_TEST_ID),
				chartKeyFromTestId(ROW2_TEST_ID),
				chartKeyFromTestId(ROW3_TEST_ID),
				'header'
			];

			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart0 = instMap.get(chart0Key);
			assert.exists(chart0, `${chart0Key} instance`);

			cy.dataTest('timeline-diagram').then($container => {
				const container = $container[0];
				const rect = container.getBoundingClientRect();

				const evt = new win.WheelEvent('wheel', {
					deltaY: -240,
					ctrlKey: false,
					bubbles: true,
					cancelable: true,
					clientX: Math.floor(rect.left + rect.width / 2),
					clientY: Math.floor(rect.top + rect.height / 2)
				});

				container.dispatchEvent(evt);
			});
		});

		cy.window().should(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;

			chartKeys.forEach(id => {
				const inst = instMap.get(id);
				const dz = inst.getOption().dataZoom[0];

				expect(dz.start).to.eq(0);
				expect(dz.end).to.eq(100);
			});
		});
	});

	it('Should allow zooming in when ctrl key is pressed', () => {
		cy.mount(<TestComponent />, testStore);

		waitForTimelineCharts();

		cy.dataTest('app-content:loading').should('not.exist');

		cy.window().then(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart0 = instMap.get(chart0Key);

			const dom = chart0.getDom();
			const canvas = dom.querySelector('canvas') as HTMLCanvasElement;
			const rect = canvas.getBoundingClientRect();

			// Center point in both DOM and ZRender coords
			const clientX = Math.floor(rect.left + rect.width / 2);
			const clientY = Math.floor(rect.top + rect.height / 2);
			const zrX = Math.floor(rect.width / 2);
			const zrY = Math.floor(rect.height / 2);

			const evt: any = new win.WheelEvent('wheel', {
				ctrlKey: true,
				deltaY: -240,
				bubbles: true,
				cancelable: true,
				clientX,
				clientY
			});

			evt.zrX = zrX;
			evt.zrY = zrY;
			evt.zrDelta = 2;

			// Ensure preventDefault exists
			if (typeof evt.preventDefault !== 'function') {
				evt.preventDefault = () => {
					evt.defaultPrevented = true;
				};
			}

			const zr = chart0.getZr();
			zr.handler.dispatch('mousewheel', evt);
		});

		// Assert dataZoom changed to zoomed in values
		cy.window().should(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;

			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID); // 'Event Source Alias 1-0'
			const chart1Key = chartKeyFromTestId(ROW2_TEST_ID); // 'Event Source Alias 2-1'
			const chart2Key = chartKeyFromTestId(ROW3_TEST_ID); // 'Event Source Alias 3-2'

			const chart0 = instMap.get(chart0Key);
			const chart1 = instMap.get(chart1Key);
			const chart2 = instMap.get(chart2Key);

			const dz0 = getDataZoom(chart0);
			const dz1 = getDataZoom(chart1);
			const dz2 = getDataZoom(chart2);

			expect(dz0?.start).to.be.greaterThan(0);
			expect(dz0?.end).to.be.lessThan(100);

			for (const [name, zoom] of [
				['chart1', dz1],
				['chart2', dz2]
			] as const) {
				expect(zoom?.start, `${name} start`).to.be.closeTo(
					dz0!.start,
					1e-9
				);
				expect(zoom?.end, `${name} end`).to.be.closeTo(
					dz0!.end,
					1e-9
				);
			}
		});
	});

	it('Should zoom in after click Zoom In button footer', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('timeline-diagram').should('exist');

		triggerZoomInFromFooter(2);

		// Footer range element shrinks due to zoom in
		cy.dataTest('timeline-diagram:footer:slider').then($slider => {
			const sliderElem = $slider[0];
			const rangeElem = sliderElem.querySelector(
				"[data-test='timeline-diagram:footer:slider:range']"
			);

			const sliderRect = sliderElem.getBoundingClientRect();
			const rangeRect = rangeElem?.getBoundingClientRect();

			expect(rangeRect?.width).to.be.lessThan(sliderRect.width);
		});

		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_S)
			.then(start => {
				expect(Number(start)).to.be.eq(18);
			});

		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_E)
			.then(end => {
				expect(Number(end)).to.be.eq(82);
			});
	});

	it('Should zoom out to full range when Reset Zoom button is clicked', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('timeline-diagram').should('exist');
		triggerZoomInFromFooter(4);

		// Now click Reset Zoom button
		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-reset'
		).should('exist');
		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-reset'
		).click();

		// Verify full range is restored
		cy.dataTest('timeline-diagram').should(
			'have.attr',
			DATA_TEST_S,
			'0'
		);
		cy.dataTest('timeline-diagram').should(
			'have.attr',
			DATA_TEST_E,
			'100'
		);

		cy.window().should(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			assert.exists(instMap, '__timelineEcharts map exists');

			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart1Key = chartKeyFromTestId(ROW2_TEST_ID);
			const chart2Key = chartKeyFromTestId(ROW3_TEST_ID);

			const chart0 = instMap.get(chart0Key);
			const chart1 = instMap.get(chart1Key);
			const chart2 = instMap.get(chart2Key);
			const header = instMap.get('header');

			assert.exists(chart0, `${chart0Key} instance`);
			assert.exists(chart1, `${chart1Key} instance`);
			assert.exists(chart2, `${chart2Key} instance`);
			assert.exists(header, 'header chart instance');

			[chart0, chart1, chart2, header].forEach(inst => {
				const dz = getDataZoom(inst);
				expect(dz?.start).to.eq(0);
				expect(dz?.end).to.eq(100);
			});
		});
	});

	it('Should zoom out to full range on Zoom Out button from footer', () => {
		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('timeline-diagram').should('exist');

		// Zoom in one time
		triggerZoomInFromFooter(1);

		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-out'
		).should('exist');

		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-out'
		).click();

		// Verify full range is restored
		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_S)
			.should(start => {
				expect(Number(start)).to.be.eq(0);
			});

		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_E)
			.should(end => {
				expect(Number(end)).to.be.eq(100);
			});
	});

	it('should normalize the mocked event source index through the Cypress service', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.then(() => {
			expect(
				testStore.getState().eventSourcesReducer.eventSourceIndex
			).to.deep.equal([
				{
					type: 'leaf',
					id: 'Event Source Alias 1-0',
					sourceName: 'Event Source Alias 1'
				},
				{
					type: 'leaf',
					id: 'Event Source Alias 2-1',
					sourceName: 'Event Source Alias 2'
				},
				{
					type: 'leaf',
					id: 'Event Source Alias 3-2',
					sourceName: 'Event Source Alias 3'
				}
			]);
		});
	});

	it('should render event sources in the mocked event source index order', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('event-sources:container')
			.dataTest('event-sources:item:name')
			.then(sourceNames => {
				expect(
					Array.from(sourceNames, sourceName =>
						sourceName.textContent?.trim()
					)
				).to.deep.equal(TIMESTAMPS.eventSourceIndex);
			});
	});

	it('should keep an active measurement after reordering event sources', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('top-bar-button:Measure').click();
		cy.dataTest('timeline-diagram:measurement-overlay').should(
			'exist'
		);
		cy.dataTest(ROW1_TEST_ID).click('center', {force: true});
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:item:bottom').click();
		});

		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest(ROW1_TEST_ID).should(
			'have.attr',
			'data-row-index',
			'2'
		);
		cy.then(() => {
			expect(
				testStore.getState().timelineReducer.measurePhase
			).to.equal(MEASURE_PHASE.MEASURING);
		});
	});

	it('Should keep tick value empty when dataZoom spans full range', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('event-sources:container').should('exist');

		cy.dataTest('event-source-list:time-reference')
			.invoke('text')
			.then(textContent => {
				expect(textContent.trim()).to.eq('0s');
			});
	});

	it('Should format time axis labels within the timestamp range', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		waitForTimelineCharts();

		cy.window().should(win => {
			const chartInstanceMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;

			assert.exists(chartInstanceMap, '__timelineEcharts map exists');

			const headerChart = chartInstanceMap.get('header');
			assert.exists(headerChart, 'header chart instance');

			const xAxis = getXAxisOptions(headerChart);
			const axisLabel = xAxis?.axisLabel as {
				formatter?: (value: number) => string;
			};
			const formatter = axisLabel?.formatter;

			if (!formatter) {
				throw new Error();
			}

			expect(formatter(-0.4)).to.eq('');
			expect(formatter(0.1)).to.eq('0.1s');
			expect(
				formatter(5).replace(/^\{edge[01]\|([^}]*)\}$/, '$1')
			).to.eq('5s');
			expect(formatter(20.5)).to.eq('');
		});
	});

	it('Should show the event message in the timestamp tooltip', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest(ROW1_TEST_ID).should('exist');
		waitForTimelineCharts();

		cy.window().then(win => {
			const chartInstanceMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			const chart = chartInstanceMap.get(
				chartKeyFromTestId(ROW1_TEST_ID)
			);

			assert.exists(chart, 'first timestamp chart instance');

			const [x, y] = chart.convertToPixel(
				{xAxisIndex: 0, yAxisIndex: 0},
				[0.6, 0]
			) as [number, number];

			const chartDom = chart.getDom() as HTMLElement;
			const canvas = chartDom.querySelector('canvas');
			const rect = chartDom.getBoundingClientRect();

			assert.exists(canvas, 'timestamp chart canvas');

			canvas!.dispatchEvent(
				new win.MouseEvent('mousemove', {
					bubbles: true,
					clientX: rect.left + x,
					clientY: rect.top + y
				})
			);
		});

		cy.dataTest('timeline-diagram:timestamp-tooltip')
			.should('be.visible')
			.and('contain.text', 'Event 1');
	});

	it('Should compute timestampRange from min/max timestamps of all event sources', () => {
		cy.mount(<TestComponent />, testStore);

		waitForTimelineCharts();

		cy.dataTest('app-content:loading').should('not.exist');

		cy.window().should(win => {
			const chartInstanceMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;

			const xAxis = getXAxisOptions(chartInstanceMap.get('header'));
			const xMin = Number(xAxis?.min);
			const xMax = Number(xAxis?.max);

			expect(xMin).to.eq(0.1);
			expect(xMax).to.eq(20);
		});
	});

	it('Should display the correct tick value after repeatedly zoom in using the button', () => {
		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist');
		cy.dataTest('event-sources:container').should('exist');
		waitForTimelineCharts();

		triggerZoomInFromFooter(14);

		cy.dataTest('event-source-list:time-reference').should(
			'have.text',
			`9s`
		);

		triggerZoomInFromFooter(40);

		cy.dataTest('event-source-list:time-reference').should(
			'have.text',
			`10s 49ms`
		);

		triggerZoomInFromFooter(25);

		cy.dataTest('event-source-list:time-reference').should(
			'have.text',
			`10s 49ms 999µs`
		);
	});
});
