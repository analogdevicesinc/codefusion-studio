/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
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
import {ColorsProvider} from '../../common/context/colors-provider';
import {navigationItems} from '../../common/constants/navigation';
import {
	DIAGRAM_CHART_ROW_ID,
	MEASURE_PHASE
} from '../../common/constants/timeline';
import {
	mapEventSources,
	normalizeEventSourceIndex
} from '../../common/utils/events';
import type {CfsEventsDocument} from '../../common/types/events';
import {
	appContextReducer,
	setActiveScreen
} from '../../state/slices/app-context/app-context.reducer';
import {
	eventSourcesReducer,
	setEventSourceData
} from '../../state/slices/event-sources/event-sources.reducer';
import {selectMeasurementRowProjection} from '../../state/slices/event-sources/event-sources.selector';
import {
	setDataZoom,
	timelineReducer
} from '../../state/slices/timeline/timeline.reducer';

const OUTER_GROUP_ID = 'event-source-group:0';
const INNER_GROUP_ID = 'event-source-group:0.1';
const EMPTY_GROUP_ID = 'event-source-group:1';

const GROUPED_EVENTS = {
	lastUpdate: '2026-01-01T00:00:00.000Z',
	tickFrequency: 1,
	tickEpoch: '2026-01-01T00:00:00.000Z',
	eventSources: {
		alpha: {events: [{ts: 2, msg: 'Alpha event'}]},
		beta: {events: [{ts: 1, msg: 'Beta event'}]},
		gamma: {events: [{ts: 3, msg: 'Gamma event'}]}
	},
	eventSourceIndex: [
		{
			name: 'Outer',
			events: ['beta', {name: 'Inner', events: ['alpha']}]
		},
		{name: 'Empty', events: []}
	]
} satisfies CfsEventsDocument;

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

function TestComponent() {
	return (
		<ColorsProvider>
			<AppContent />
		</ColorsProvider>
	);
}

const chartRowTestId = (rowId: string) =>
	`${DIAGRAM_CHART_ROW_ID}:${rowId}`;

const blankGroupRowTestId = (groupId: string) =>
	`timeline-diagram:group-row:${groupId}`;

const mountGroupedTimeline = () => {
	testStore.dispatch(setActiveScreen(navigationItems.timeline));
	cy.mount(<TestComponent />, testStore);

	cy.dataTest('event-sources:container').should('exist');

	cy.then(() => {
		const eventSources = mapEventSources(GROUPED_EVENTS);

		testStore.dispatch(
			setEventSourceData({
				eventSources,
				eventSourceIndex: normalizeEventSourceIndex(
					GROUPED_EVENTS.eventSourceIndex,
					eventSources
				)
			})
		);
	});

	cy.dataTest('event-sources:item:0').should('contain.text', 'Outer');
	expectChartMounted('header');
};

const expectVisibleRows = (
	expectedNames: string[],
	expectedPaddings: number[]
) => {
	cy.dataTest('event-sources:item:name')
		.should('have.length', expectedNames.length)
		.should(names => {
			expect(
				Array.from(names, name => name.textContent?.trim())
			).to.deep.equal(expectedNames);
		});

	expectedPaddings.forEach((padding, index) => {
		cy.dataTest(`event-sources:item:${index}`).within(() => {
			cy.dataTest('event-sources:item:content').should(
				'have.css',
				'padding-inline-start',
				`${padding}px`
			);
		});
	});
};

const expectListAndChartRowsAligned = (rowCount: number) => {
	const expectedIndices = Array.from({length: rowCount}, (_, index) =>
		String(index)
	);

	cy.dataTest('event-sources:list')
		.children('[data-row-index]')
		.then(rows => {
			expect(
				Array.from(rows, row => row.getAttribute('data-row-index'))
			).to.deep.equal(expectedIndices);
		});

	cy.dataTest('timeline:scroll-content')
		.children('section')
		.children('[data-row-index]')
		.should('have.length', rowCount)
		.then(rows => {
			expect(
				Array.from(rows, row => row.getAttribute('data-row-index'))
			).to.deep.equal(expectedIndices);
		});
};

const clickTimestamp = (rowId: string, timestamp: number) => {
	cy.window()
		.should((windowObject: any) => {
			const chart = windowObject.__timelineEcharts?.get(rowId);

			expect(chart, `chart for ${rowId}`).not.to.equal(undefined);
		})
		.then((windowObject: any) => {
			const chart = windowObject.__timelineEcharts?.get(rowId);

			if (chart === undefined) {
				throw new Error(`Chart unmounted before click for ${rowId}`);
			}

			const [x, y] = chart.convertToPixel(
				{xAxisIndex: 0, yAxisIndex: 0},
				[timestamp, 0]
			) as [number, number];
			const chartElement = chart.getDom() as HTMLElement;
			const chartBounds = chartElement.getBoundingClientRect();
			const pointer = {
				clientX: chartBounds.left + x,
				clientY: chartBounds.top + y,
				bubbles: true,
				force: true
			};

			cy.dataTest(chartRowTestId(rowId)).trigger(
				'mousemove',
				pointer
			);
			// Wait for a resolved preview; chart overlap does not affect readiness.
			cy.dataTest('timeline-diagram:measurement-label:cursor')
				.should('exist')
				.invoke('text')
				.should('not.be.empty');
			cy.dataTest(chartRowTestId(rowId)).trigger('click', pointer);
		});
};

const clickChartBackground = (rowId: string, timestamp: number) => {
	clickTimestamp(rowId, timestamp);
};

const expectChartMounted = (rowId: string) => {
	cy.window().should((windowObject: any) => {
		expect(windowObject.__timelineEcharts?.has(rowId)).to.equal(true);
	});
};

const expectMarkerInChartRow = (
	point: 'start' | 'end',
	rowId: string
) => {
	cy.dataTest(`timeline-diagram:measurement-point:${point}`)
		.should('exist')
		.then(marker => {
			cy.dataTest(chartRowTestId(rowId)).then(row => {
				const markerRect = marker[0].getBoundingClientRect();
				const rowRect = row[0].getBoundingClientRect();
				const markerCenterY = markerRect.top + markerRect.height / 2;

				expect(markerCenterY).to.be.within(
					rowRect.top,
					rowRect.bottom
				);
			});
		});
};

const expectGroupBadge = (rowIndex: number, count: number) => {
	cy.dataTest(`event-sources:group:count:${rowIndex}`).should(
		badge => {
			expect(badge.text().trim()).to.equal(String(count));
		}
	);
};

describe('Timeline event source groups', () => {
	beforeEach(() => {
		testStore = createTestStore();
		cy.viewport(1200, 800);
	});

	it('should render indexed groups collapsed with aggregate charts', () => {
		mountGroupedTimeline();

		expectVisibleRows(['Outer', 'Empty', 'gamma'], [8, 8, 8]);
		expectListAndChartRowsAligned(3);
		expectGroupBadge(0, 2);
		expectGroupBadge(1, 0);

		cy.dataTest('event-sources:list')
			.children()
			.each(row => {
				cy.wrap(row).find('h5').should('exist');
			});

		cy.dataTest('event-sources:group:toggle:0')
			.should('have.attr', 'aria-label', 'Expand Outer')
			.find('span')
			.should('have.css', 'transform', 'none');

		cy.dataTest(chartRowTestId(OUTER_GROUP_ID)).should('exist');
		cy.dataTest(chartRowTestId(EMPTY_GROUP_ID)).should('exist');
		cy.dataTest(chartRowTestId('gamma-2')).should('exist');

		cy.window().should((windowObject: any) => {
			const aggregateChart =
				windowObject.__timelineEcharts?.get(OUTER_GROUP_ID);
			expect(aggregateChart, 'outer aggregate chart').not.to.equal(
				undefined
			);

			const chartOptions = aggregateChart.getOption();
			const seriesOptions = Array.isArray(chartOptions.series)
				? chartOptions.series[0]
				: chartOptions.series;
			const points = seriesOptions.data as number[][];
			expect(points.map(point => point[0])).to.deep.equal([1, 2]);

			const tooltipOptions = Array.isArray(chartOptions.tooltip)
				? chartOptions.tooltip[0]
				: chartOptions.tooltip;
			const formatter = tooltipOptions.formatter as
				| ((params: {dataIndex: number}) => string)
				| undefined;

			if (!formatter) throw new Error('Missing aggregate tooltip');

			const tooltip = formatter({dataIndex: 0});
			expect(tooltip).to.contain('beta');
			expect(tooltip).to.contain('Beta event');
		});

		cy.then(() => {
			expect(
				testStore.getState().timelineReducer.expandedGroupIds
			).to.deep.equal({});
		});
	});

	it('should keep measurement row projection stable across data zoom updates', () => {
		mountGroupedTimeline();

		cy.then(() => {
			const beforeDataZoom = selectMeasurementRowProjection(
				testStore.getState()
			);

			testStore.dispatch(setDataZoom({start: 10, end: 90}));

			const afterDataZoom = selectMeasurementRowProjection(
				testStore.getState()
			);

			expect(afterDataZoom).to.equal(beforeDataZoom);
			expect(afterDataZoom.visibleChartRowIds).to.deep.equal(
				new Set([OUTER_GROUP_ID, EMPTY_GROUP_ID, 'gamma-2'])
			);
			expect(afterDataZoom.visibleGroupRowIds).to.deep.equal(
				new Set([OUTER_GROUP_ID, EMPTY_GROUP_ID])
			);
		});
	});

	it('should expand recursively and preserve expansion across navigation', () => {
		mountGroupedTimeline();

		cy.dataTest('event-sources:group:toggle:0').click();

		expectVisibleRows(
			['Outer', 'beta', 'Inner', 'Empty', 'gamma'],
			[8, 36, 36, 8, 8]
		);
		expectListAndChartRowsAligned(5);
		expectGroupBadge(0, 2);
		expectGroupBadge(2, 1);
		expectGroupBadge(3, 0);

		cy.dataTest('event-sources:group:toggle:0')
			.should('have.attr', 'aria-label', 'Collapse Outer')
			.find('span')
			.should(span => {
				expect(span.css('transform')).not.to.equal('none');
			});

		cy.dataTest(chartRowTestId(OUTER_GROUP_ID)).should('not.exist');
		cy.dataTest(blankGroupRowTestId(OUTER_GROUP_ID))
			.should('exist')
			.and('have.attr', 'data-row-id', OUTER_GROUP_ID)
			.find('canvas')
			.should('not.exist');
		cy.dataTest(chartRowTestId(INNER_GROUP_ID)).should('exist');
		cy.window().should((windowObject: any) => {
			expect(
				windowObject.__timelineEcharts?.has(OUTER_GROUP_ID)
			).to.equal(false);
			expect(
				windowObject.__timelineEcharts?.has(INNER_GROUP_ID)
			).to.equal(true);
		});

		cy.dataTest('event-sources:group:toggle:2').click();

		expectVisibleRows(
			['Outer', 'beta', 'Inner', 'alpha', 'Empty', 'gamma'],
			[8, 36, 36, 64, 8, 8]
		);
		expectListAndChartRowsAligned(6);
		cy.dataTest(chartRowTestId(INNER_GROUP_ID)).should('not.exist');
		cy.dataTest(blankGroupRowTestId(INNER_GROUP_ID))
			.should('have.attr', 'data-row-id', INNER_GROUP_ID)
			.then(row => {
				expect(
					row[0].getBoundingClientRect().height
				).to.be.greaterThan(0);
			});

		cy.dataTest('top-bar-button:Measure').click();
		cy.dataTest(blankGroupRowTestId(INNER_GROUP_ID)).click('center', {
			force: true
		});
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);
		cy.window().then(windowObject => {
			windowObject.dispatchEvent(
				new windowObject.KeyboardEvent('keydown', {key: 'Escape'})
			);
		});

		cy.dataTest('nav-item:list').click();
		cy.then(() => {
			expect(
				testStore.getState().appContextReducer.activeScreen
			).to.equal(navigationItems.list);
		});
		cy.dataTest('nav-item:timeline').click();

		expectVisibleRows(
			['Outer', 'beta', 'Inner', 'alpha', 'Empty', 'gamma'],
			[8, 36, 36, 64, 8, 8]
		);
		cy.dataTest('event-sources:group:toggle:0').should(
			'have.attr',
			'aria-label',
			'Collapse Outer'
		);
		cy.dataTest('event-sources:group:toggle:2').should(
			'have.attr',
			'aria-label',
			'Collapse Inner'
		);
		cy.then(() => {
			expect(
				testStore.getState().timelineReducer.expandedGroupIds
			).to.deep.equal({
				[OUTER_GROUP_ID]: true,
				[INNER_GROUP_ID]: true
			});
		});
	});

	it('should reproject a nested snapped marker when its group is collapsed', () => {
		mountGroupedTimeline();

		cy.dataTest('event-sources:group:toggle:0').click();
		cy.dataTest('event-sources:group:toggle:2').click();
		cy.dataTest('top-bar-button:Measure').click();
		cy.window().should((windowObject: any) => {
			expect(windowObject.__timelineEcharts?.has('alpha-0')).to.equal(
				true
			);
		});
		clickTimestamp('alpha-0', 2);

		cy.dataTest('timeline-diagram:measurement-point:start')
			.should('exist')
			.invoke('css', 'top')
			.then(expandedTopValue => {
				const expandedTop = Number.parseFloat(
					String(expandedTopValue)
				);

				cy.dataTest('event-sources:group:toggle:2').click();
				cy.dataTest(
					'timeline-diagram:measurement-point:start'
				).should(marker => {
					const collapsedTop = Number.parseFloat(marker.css('top'));
					expect(collapsedTop).to.be.lessThan(expandedTop);
				});

				cy.dataTest('event-sources:group:toggle:2').click();
				cy.dataTest(
					'timeline-diagram:measurement-point:start'
				).should(marker => {
					const restoredTop = Number.parseFloat(marker.css('top'));
					expect(restoredTop).to.be.closeTo(expandedTop, 1);
				});
			});
	});

	it('should reproject a snapped aggregate marker through each expanded level', () => {
		mountGroupedTimeline();

		cy.dataTest('top-bar-button:Measure').click();
		clickTimestamp(OUTER_GROUP_ID, 2);
		expectMarkerInChartRow('start', OUTER_GROUP_ID);

		cy.dataTest('event-sources:group:toggle:0').click();
		expectMarkerInChartRow('start', INNER_GROUP_ID);

		cy.dataTest('event-sources:group:toggle:2').click();
		expectMarkerInChartRow('start', 'alpha-0');

		cy.dataTest('event-sources:group:toggle:2').click();
		expectMarkerInChartRow('start', INNER_GROUP_ID);

		cy.dataTest('event-sources:group:toggle:0').click();
		expectMarkerInChartRow('start', OUTER_GROUP_ID);
	});

	it('should reproject fixed aggregate endpoints to their owning rows', () => {
		mountGroupedTimeline();

		cy.dataTest('top-bar-button:Measure').click();
		clickTimestamp(OUTER_GROUP_ID, 1);
		expectMarkerInChartRow('start', OUTER_GROUP_ID);
		clickTimestamp(OUTER_GROUP_ID, 2);

		expectMarkerInChartRow('end', OUTER_GROUP_ID);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);

		cy.dataTest('event-sources:group:toggle:0').click();
		expectMarkerInChartRow('start', 'beta-1');
		expectMarkerInChartRow('end', INNER_GROUP_ID);

		cy.dataTest('event-sources:group:toggle:2').click();
		expectMarkerInChartRow('start', 'beta-1');
		expectMarkerInChartRow('end', 'alpha-0');
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);
	});

	it('should reproject an aggregate background start point', () => {
		mountGroupedTimeline();

		cy.dataTest('top-bar-button:Measure').click();
		clickChartBackground(OUTER_GROUP_ID, 1.5);
		expectChartMounted(OUTER_GROUP_ID);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-guide:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);

		cy.dataTest('event-sources:group:toggle:0').click();
		cy.dataTest(blankGroupRowTestId(OUTER_GROUP_ID)).should('exist');
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-guide:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-point:start').should(
			'not.exist'
		);
		cy.then(() => {
			expect(
				testStore.getState().timelineReducer.measurePhase
			).to.equal(MEASURE_PHASE.MEASURING);
		});

		cy.dataTest('event-sources:group:toggle:0').click();
		expectChartMounted(OUTER_GROUP_ID);
		cy.dataTest('timeline-diagram:measurement-label:start').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-guide:start').should(
			'exist'
		);
	});

	(['start', 'end'] as const).forEach(backgroundPoint => {
		it(`should keep a fixed aggregate background ${backgroundPoint} point projected`, () => {
			mountGroupedTimeline();

			cy.dataTest('top-bar-button:Measure').click();

			if (backgroundPoint === 'start') {
				clickChartBackground(OUTER_GROUP_ID, 1.5);
				cy.dataTest(
					'timeline-diagram:measurement-label:start'
				).should('exist');
				clickTimestamp('gamma-2', 3);
			} else {
				clickTimestamp('gamma-2', 3);
				expectMarkerInChartRow('start', 'gamma-2');
				clickChartBackground(OUTER_GROUP_ID, 1.5);
			}

			expectChartMounted(OUTER_GROUP_ID);
			cy.dataTest('timeline-diagram:measurement-delta-line').should(
				'exist'
			);
			cy.dataTest('timeline-diagram:measurement-stem').should(
				'exist'
			);
			cy.dataTest(
				`timeline-diagram:measurement-point:${backgroundPoint}`
			).should('not.exist');

			cy.dataTest('event-sources:group:toggle:0').click();
			cy.dataTest(
				`timeline-diagram:measurement-label:${backgroundPoint}`
			).should('exist');
			cy.dataTest(
				`timeline-diagram:measurement-guide:${backgroundPoint}`
			).should('exist');

			if (backgroundPoint === 'end') {
				cy.dataTest(blankGroupRowTestId(OUTER_GROUP_ID)).should(
					'exist'
				);
				cy.dataTest('timeline-diagram:measurement-delta-line').should(
					'exist'
				);
			} else {
				expectChartMounted('gamma-2');
				cy.dataTest('timeline-diagram:measurement-delta-line').should(
					'exist'
				);
			}

			cy.dataTest('timeline-diagram:measurement-stem').should(
				'exist'
			);
			cy.dataTest(
				`timeline-diagram:measurement-point:${backgroundPoint}`
			).should('not.exist');
			cy.then(() => {
				expect(
					testStore.getState().timelineReducer.measurePhase
				).to.equal(MEASURE_PHASE.FIXED);
			});

			const visiblePoint =
				backgroundPoint === 'start' ? 'end' : 'start';
			cy.dataTest(
				`timeline-diagram:measurement-label:${visiblePoint}`
			).should('exist');
			cy.dataTest(
				`timeline-diagram:measurement-point:${visiblePoint}`
			).should('exist');

			cy.dataTest('event-sources:group:toggle:0').click();
			expectChartMounted(OUTER_GROUP_ID);
			cy.dataTest(
				`timeline-diagram:measurement-label:${backgroundPoint}`
			).should('exist');
			cy.dataTest(
				`timeline-diagram:measurement-guide:${backgroundPoint}`
			).should('exist');
			cy.dataTest(
				`timeline-diagram:measurement-point:${backgroundPoint}`
			).should('not.exist');
			cy.dataTest('timeline-diagram:measurement-delta-line').should(
				'exist'
			);
			cy.dataTest('timeline-diagram:measurement-stem').should(
				'exist'
			);
		});
	});

	it('should project a leaf background point through its collapsed aggregate', () => {
		mountGroupedTimeline();

		cy.dataTest('event-sources:group:toggle:0').click();
		cy.dataTest('top-bar-button:Measure').click();
		clickTimestamp('gamma-2', 3);
		expectMarkerInChartRow('start', 'gamma-2');
		clickChartBackground('beta-1', 1.5);

		expectChartMounted('beta-1');
		cy.dataTest('timeline-diagram:measurement-delta-line').should(
			'exist'
		);
		cy.dataTest('timeline-diagram:measurement-label:delta').should(
			'exist'
		);
		cy.dataTest('event-sources:group:toggle:0').click();
		expectChartMounted(OUTER_GROUP_ID);
		cy.dataTest('timeline-diagram:measurement-delta-line').should(
			'exist'
		);

		cy.dataTest('event-sources:group:toggle:0').click();
		expectChartMounted('beta-1');
		cy.dataTest('timeline-diagram:measurement-delta-line').should(
			'exist'
		);
	});
});
