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

import {store} from '../../state/store';
import {AppContent} from '../../components/app-content/app-content';
import {navigationItems} from '../../common/constants/navigation';
import {setActiveScreen} from '../../state/slices/app-context/app-context.reducer';
import {
	DATA_TEST_E,
	DATA_TEST_S,
	DIAGRAM_CHART_ROW_ID,
	INITIAL_DATA_ZOOM,
	UNITS_LABEL
} from '../../common/constants/timeline';
import {setDataZoom} from '../../state/slices/timeline/timeline.reducer';
import type {EChartsType} from 'echarts';

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
		cy.wait(200);
		cy.dataTest('timeline-diagram:footer:zoom-buttons:zoom-in')
			.should('exist', {timeout: 10000})
			.should('not.be.disabled', {timeout: 10000})
			.click();
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

function TestComponent() {
	return <AppContent />;
}

describe('Timeline', () => {
	beforeEach(() => {
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		store.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('Should mount and display all the main sections', () => {
		const testStore = store;

		testStore.dispatch(setActiveScreen(navigationItems.timeline));

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('timeline:container').should('exist');
			cy.dataTest('cfs-top-bar:container').should('exist');
			cy.dataTest('sev-header:cta-container').should('exist');
			cy.dataTest('app-content:loading').should('not.exist');
			cy.dataTest('event-sources:container').should('exist');
			cy.dataTest('timeline-diagram:xticks-chart-row').should(
				'exist'
			);
			cy.dataTest(ROW1_TEST_ID).should('exist');
			cy.dataTest(ROW2_TEST_ID).should('exist');
			cy.dataTest(ROW3_TEST_ID).should('exist');
			cy.dataTest('timeline-diagram:footer').should('exist');
			cy.dataTest('timeline-diagram:footer:slider').should('exist');
			cy.dataTest('timeline-diagram:footer:zoom-buttons').should(
				'exist'
			);
		});
		cy.dataTest('event-sources:container').should('exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:xticks-chart-row').should('exist', {
			timeout: 10000
		});
		cy.dataTest(ROW1_TEST_ID).should('exist', {timeout: 10000});
		cy.dataTest(ROW2_TEST_ID).should('exist', {timeout: 10000});
		cy.dataTest(ROW3_TEST_ID).should('exist', {timeout: 10000});
		cy.dataTest('timeline-diagram:footer').should('exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:footer:slider').should('exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:footer:zoom-buttons').should(
			'exist',
			{timeout: 10000}
		);
	});

	it('Should sync dataZoom between charts', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:xticks-chart-row').should('exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram').should('exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:footer').should('exist', {
			timeout: 10000
		});

		triggerZoomInFromFooter(3);

		// Assert exact dataZoom values across timestamp charts and header chart
		cy.window().then(win => {
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

			assert.strictEqual(dz0?.start, 24.4);
			assert.strictEqual(dz0?.end, 75.6);

			// All charts and header must match exactly
			assert.deepEqual(dz1, dz0, 'chart1 matches chart0');
			assert.deepEqual(dz2, dz0, 'chart2 matches chart0');
			assert.deepEqual(dzHeader, dz0, 'header matches chart0');
		});
	});

	it('Should prevent zooming in when ctrl key is not pressed', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest(ROW1_TEST_ID).should('exist', {timeout: 10000});

		cy.window().then(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart1Key = chartKeyFromTestId(ROW2_TEST_ID);
			const chart2Key = chartKeyFromTestId(ROW3_TEST_ID);

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

			cy.wait(300);

			[chart0Key, chart1Key, chart2Key, 'header'].forEach(id => {
				const inst = instMap.get(id);
				const dz = inst.getOption().dataZoom[0];

				expect(dz.start).to.eq(0);
				expect(dz.end).to.eq(100);
			});
		});
	});

	it('Should allow zooming in when ctrl key is pressed', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest(ROW1_TEST_ID).should('exist', {timeout: 10000});

		cy.window().then(win => {
			const instMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			const chart0Key = chartKeyFromTestId(ROW1_TEST_ID);
			const chart0 = instMap.get(chart0Key);
			assert.exists(chart0, `${chart0Key} instance`);

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

		cy.wait(100);

		// Assert dataZoom changed to zoomed in values
		cy.window().then(win => {
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
			assert.exists(chart0, `${chart0Key} instance`);
			assert.exists(chart1, `${chart1Key} instance`);
			assert.exists(chart2, `${chart2Key} instance`);

			const dz0 = getDataZoom(chart0);
			const dz1 = getDataZoom(chart1);
			const dz2 = getDataZoom(chart2);

			expect(dz0?.start).to.be.greaterThan(0);
			expect(dz0?.end).to.be.lessThan(100);

			assert.deepEqual(dz1, dz0, 'chart1 matches chart0');
			assert.deepEqual(dz2, dz0, 'chart2 matches chart0');
		});
	});

	it('Should zoom in after click Zoom In button footer', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram').should('exist', {
			timeout: 10000
		});

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
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram').should('exist', {
			timeout: 10000
		});
		triggerZoomInFromFooter(4);

		// Now click Reset Zoom button
		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-reset'
		).should('exist');
		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-reset'
		).click();

		cy.wait(500);

		// Verify full range is restored
		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_S)
			.then(start => {
				expect(Number(start)).to.be.eq(0);
			});

		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_E)
			.then(end => {
				expect(Number(end)).to.be.eq(100);
			});

		cy.window().then(win => {
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
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram').should('exist', {
			timeout: 10000
		});

		// Zoom in one time
		triggerZoomInFromFooter(1);

		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-out'
		).should('exist');

		cy.dataTest(
			'timeline-diagram:footer:zoom-buttons:zoom-out'
		).click();

		cy.wait(100);

		// Verify full range is restored
		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_S)
			.then(start => {
				expect(Number(start)).to.be.eq(0);
			});

		cy.dataTest('timeline-diagram')
			.invoke('attr', DATA_TEST_E)
			.then(end => {
				expect(Number(end)).to.be.eq(100);
			});
	});

	it('Should open options menu then close it via ESC', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		// Open the options menu on the first item
		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:options-menu:button')
				.should('exist')
				.click();
			cy.dataTest('event-sources:options-menu:panel').should('exist');

			// Trigger Escape on the menu container to close
			cy.dataTest('event-sources:options-menu').trigger('keydown', {
				key: 'Escape',
				code: 'Escape',
				keyCode: 27,
				which: 27,
				bubbles: true
			});
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);

			// Open again, then click outside to close
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:panel').should('exist');

			// Focus the container so blur is detected, then click outside
			cy.dataTest('event-sources:options-menu').then($el => {
				$el[0].focus();
			});
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);
		});
	});

	it('Should open options menu on first item and select "Move to bottom", then close panel and check', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:item:name')
				.should('exist')
				.should('have.text', 'Event Source Alias 1');
		});

		// Open the options menu on the first item, then click the last option (Move to bottom)
		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:options-menu:button')
				.should('exist')
				.click();
			cy.dataTest('event-sources:options-menu:panel').should('exist');

			cy.dataTest('event-sources:options-menu:item:bottom')
				.should('exist')
				.click();

			// Panel should be closed after selection
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);
		});

		// Assert the item with the same label moved to the last position
		cy.dataTest('event-sources:container')
			.dataTest('event-sources:item:name')
			.last()
			.should('have.text', 'Event Source Alias 1');
	});

	it('Should update diagram when list is reordered via options menu', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		// Assert initial diagram row order
		const initialOrder = [ROW1_TEST_ID, ROW2_TEST_ID, ROW3_TEST_ID];
		cy.get(`[data-test^='${DIAGRAM_CHART_ROW_ID}:']`).then(
			rowsElem => {
				const order = Array.from(rowsElem, el =>
					el.getAttribute('data-test')
				);
				expect(order).to.deep.equal(initialOrder);
			}
		);

		// Open options menu on the second item and choose "Move up"
		cy.dataTest('event-sources:item:1').within(() => {
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:panel').should('exist');
			cy.dataTest('event-sources:options-menu:item:up').click();
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);
		});

		// Assert list order changed accordingly
		cy.dataTest('event-sources:container')
			.dataTest('event-sources:item:name')
			.then($names => {
				const labels = Array.from($names, n => n.textContent?.trim());
				expect(labels).to.deep.equal([
					'Event Source Alias 2',
					'Event Source Alias 1',
					'Event Source Alias 3'
				]);
			});

		// Assert diagram rows reflect the same order
		const afterOrder = [ROW2_TEST_ID, ROW1_TEST_ID, ROW3_TEST_ID];
		cy.get(`[data-test^='${DIAGRAM_CHART_ROW_ID}:']`).then(
			rowsElem => {
				const order = Array.from(rowsElem, el =>
					el.getAttribute('data-test')
				);
				expect(order).to.deep.equal(afterOrder);
			}
		);
	});

	it('Should keep tick value empty when dataZoom spans full range', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('event-sources:container').should('exist', {
			timeout: 10000
		});

		cy.dataTest('event-source-list:empty-block-item')
			.invoke('text')
			.then(textContent => {
				expect(textContent.trim()).to.eq('');
			});
	});

	it('Should format xticks labels within the timestamp range', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:xticks-chart-row').should('exist', {
			timeout: 10000
		});

		cy.window().then(win => {
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

			const minValue = Number(xAxis?.min);
			const maxValue = Number(xAxis?.max);

			assert.isTrue(
				Number.isFinite(minValue),
				'minValue should be finite'
			);
			assert.isTrue(
				Number.isFinite(maxValue),
				'maxValue should be finite'
			);

			const insideValue = minValue + (maxValue - minValue) / 4;

			expect(formatter(minValue - 0.5)).to.eq('');
			const startLabel = formatter(minValue);
			expect(startLabel.length).to.be.greaterThan(0);
			expect(startLabel.endsWith('s')).to.equal(true);

			const innerLabel = formatter(insideValue);
			expect(innerLabel.length).to.be.greaterThan(0);
			expect(innerLabel.endsWith('s')).to.equal(true);

			expect(formatter(maxValue + 0.5)).to.eq('');
		});
	});

	it('Should compute timestampRange from min/max timestamps of all event sources', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('timeline-diagram:xticks-chart-row').should('exist', {
			timeout: 10000
		});

		cy.window().then(win => {
			const chartInstanceMap = (win as any).__timelineEcharts as Map<
				string,
				any
			>;
			assert.exists(chartInstanceMap, '__timelineEcharts map exists');

			const headerChart = chartInstanceMap.get('header');
			assert.exists(headerChart, 'header chart instance');

			const xAxis = getXAxisOptions(headerChart);
			const xMin = Number(xAxis?.min);
			const xMax = Number(xAxis?.max);

			expect(xMin).to.eq(0.1);
			expect(xMax).to.eq(20);
		});
	});

	it('Should display the correct tick value after repeatedly zoom in using the button', () => {
		const testStore = {...store};

		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});
		cy.dataTest('event-sources:container').should('exist', {
			timeout: 10000
		});

		triggerZoomInFromFooter(14);

		cy.dataTest('event-source-list:empty-block-item')
			.invoke('text')
			.then(textContent => {
				expect(textContent.trim()).to.eq(`9${UNITS_LABEL.s}`);
			});

		triggerZoomInFromFooter(40);
		cy.wait(200);

		cy.dataTest('event-source-list:empty-block-item')
			.invoke('text')
			.then(textContent => {
				expect(textContent.trim()).to.eq(
					`10${UNITS_LABEL.s} 49${UNITS_LABEL.ms}`
				);
			});

		triggerZoomInFromFooter(25);
		cy.wait(200);

		cy.dataTest('event-source-list:empty-block-item')
			.invoke('text')
			.then(textContent => {
				expect(textContent.trim()).to.eq(
					`10${UNITS_LABEL.s} 49${UNITS_LABEL.ms} 999${UNITS_LABEL.us}`
				);
			});
	});
});
