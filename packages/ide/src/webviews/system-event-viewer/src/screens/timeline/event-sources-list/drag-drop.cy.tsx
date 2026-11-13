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

// Drag-and-drop coverage for the timeline event sources list. Covers:
//  - T1: dragged row carries the `data-row-dragged` attribute while dragging.
//  - T2: floating card follows the pointer on both axes.
//  - T3: drop indicator positioning + refresh on scroll.
//  - T4: commit-on-drop — pointer release in a reorder zone mutates the list,
//        release on the same row or outside the diagram leaves it unchanged.

import {configureStore} from '@reduxjs/toolkit';
import {NEW_GROUP_NAME} from '../../../common/constants/events';
import {navigationItems} from '../../../common/constants/navigation';
import {
	AUTO_SCROLL_EDGE_PX,
	AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME,
	INITIAL_DATA_ZOOM,
	TIMELINE_DRAG_ACTIVE,
	TIMELINE_DRAG_OUTSIDE,
	HEADER_HEIGHT
} from '../../../common/constants/timeline';
import {
	computeAutoScrollVelocity,
	shouldStopAutoScrollAtBoundary
} from '../../../common/utils/timeline-diagram';
import {
	mapEventSources,
	normalizeEventSourceIndex
} from '../../../common/utils/events';
import {AppContent} from '../../../components/app-content/app-content';
import {
	appContextReducer,
	setActiveScreen
} from '../../../state/slices/app-context/app-context.reducer';
import {
	setDataZoom,
	timelineReducer,
	toggleGroupExpanded
} from '../../../state/slices/timeline/timeline.reducer';
import {
	eventSourcesReducer,
	setEventSourceData
} from '../../../state/slices/event-sources/event-sources.reducer';
import type {
	CfsEventsDocument,
	EventSourceTreeNode
} from '../../../common/types/events';
import '../../../app.scss';
import {ColorsProvider} from '../../../common/context/colors-provider';

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

const INITIAL_ORDER = [
	'Event Source Alias 1',
	'Event Source Alias 2',
	'Event Source Alias 3'
];

const SOURCE_GROUP_ID = 'event-source-group:0';
const TARGET_GROUP_ID = 'event-source-group:1';
const NESTED_GROUP_ID = 'event-source-group:1.1';
const SOURCE_CHILD_ONE_ID = 'Source.Child.1-0';
const TARGET_CHILD_ID = 'Target.Child-2';
const NESTED_CHILD_ID = 'Nested.Child-3';
const ROOT_LEAF_ONE_ID = 'Root.Leaf.1-4';
const MOVABLE_LEAF_ID = 'Movable.Leaf-6';

const TREE_EVENTS = {
	lastUpdate: '2026-08-28T00:00:00.000Z',
	tickFrequency: 1,
	tickEpoch: '2026-08-28T00:00:00.000Z',
	eventSources: {
		'Source.Child.1': {events: [{ts: 1}]},
		'Source.Child.2': {events: [{ts: 2}]},
		'Target.Child': {events: [{ts: 3}]},
		'Nested.Child': {events: [{ts: 4}]},
		'Root.Leaf.1': {events: [{ts: 5}]},
		'Root.Leaf.2': {events: [{ts: 6}]},
		'Movable.Leaf': {events: [{ts: 7}]}
	},
	eventSourceIndex: [
		{
			name: 'Source Group',
			events: ['Source.Child.1', 'Source.Child.2']
		},
		{
			name: 'Target Group',
			events: [
				'Target.Child',
				{name: 'Nested Group', events: ['Nested.Child']}
			]
		},
		'Root.Leaf.1',
		'Root.Leaf.2',
		'Movable.Leaf'
	]
} satisfies CfsEventsDocument;

function TestComponent() {
	return (
		<ColorsProvider>
			<AppContent />
		</ColorsProvider>
	);
}

function dispatchPointerMove(clientX: number, clientY: number) {
	cy.window().then(win => {
		const pointerMove = new win.PointerEvent('pointermove', {
			bubbles: true,
			cancelable: true,
			buttons: 1,
			pointerId: 1,
			pointerType: 'mouse',
			clientX,
			clientY
		});

		win.dispatchEvent(pointerMove);
	});
}

function dispatchPointerUp(clientX: number, clientY: number) {
	cy.window().then(win => {
		const pointerUp = new win.PointerEvent('pointerup', {
			bubbles: true,
			cancelable: true,
			button: 0,
			buttons: 0,
			pointerId: 1,
			pointerType: 'mouse',
			clientX,
			clientY
		});

		win.dispatchEvent(pointerUp);
	});
}

function dispatchPointerCancel() {
	cy.window().then(win => {
		win.dispatchEvent(
			new win.PointerEvent('pointercancel', {
				bubbles: true,
				pointerId: 1,
				pointerType: 'mouse'
			})
		);
	});
}

function startDraggingRow(rowIndex: number) {
	cy.dataTest(`event-sources:item:drag-handle:${rowIndex}`)
		.should('exist')
		.then(handle => {
			const rect = handle[0].getBoundingClientRect();

			cy.wrap(handle).trigger('pointerdown', {
				button: 0,
				buttons: 1,
				pointerId: 1,
				pointerType: 'mouse',
				clientX: rect.left + rect.width / 2,
				clientY: rect.top + rect.height / 2,
				force: true
			});
		});
}

function mountTreeTimeline(expandedGroupIds: string[] = []) {
	cy.mount(<TestComponent />, testStore);

	cy.dataTest('app-content:loading').should('not.exist', {
		timeout: 10000
	});

	cy.then(() => {
		const eventSources = mapEventSources(TREE_EVENTS);

		testStore.dispatch(
			setEventSourceData({
				eventSources,
				eventSourceIndex: normalizeEventSourceIndex(
					TREE_EVENTS.eventSourceIndex,
					eventSources
				)
			})
		);

		expandedGroupIds.forEach(groupId => {
			testStore.dispatch(toggleGroupExpanded(groupId));
		});
	});

	cy.dataTest('event-sources:item:0').should(
		'contain.text',
		'Source Group'
	);
}

function getListRowByNodeId(nodeId: string) {
	return cy
		.dataTest('event-sources:list')
		.find(`[data-row-id="${nodeId}"]`)
		.should('have.length', 1);
}

function startDraggingNode(nodeId: string) {
	getListRowByNodeId(nodeId).then(row => {
		const rowIndex = Number(row.attr('data-row-index'));

		expect(Number.isNaN(rowIndex)).to.equal(false);
		startDraggingRow(rowIndex);
	});
}

function movePointerOverNode(nodeId: string, rowRatio: number) {
	getListRowByNodeId(nodeId).then(row => {
		const rect = row[0].getBoundingClientRect();

		dispatchPointerMove(
			rect.left + rect.width / 2,
			rect.top + rect.height * rowRatio
		);
	});
}

function dropOnNode(nodeId: string, rowRatio: number) {
	getListRowByNodeId(nodeId).then(row => {
		const rect = row[0].getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height * rowRatio;

		dispatchPointerMove(clientX, clientY);
		dispatchPointerUp(clientX, clientY);
	});
}

function getNodeLabel(node: EventSourceTreeNode): string {
	return node.type === 'group' ? node.name : node.sourceName;
}

function assertListOrder(expectedNames: string[]) {
	cy.dataTest('event-sources:container')
		.dataTest('event-sources:item:name')
		.should(names => {
			const actual = Array.from(names, item =>
				item.textContent?.trim()
			);

			expect(actual).to.deep.equal(expectedNames);
		});
}

function assertGroupCollapsed(groupName: string) {
	cy.dataTest('event-sources:list')
		.contains('[data-row-type="group"]', groupName)
		.should('have.length', 1)
		.then(groupRow => {
			const rowIndex = groupRow.attr('data-row-index');

			if (rowIndex === undefined) {
				throw new Error(`Missing row index for group ${groupName}`);
			}

			cy.dataTest(`event-sources:group:toggle:${rowIndex}`)
				.should('be.visible')
				.and('have.attr', 'aria-label', `Expand ${groupName}`);
		});
}

function assertDropIndicatorTop(expectedTop: number) {
	cy.dataTest('timeline:drop-indicator')
		.should('be.visible')
		.and(indicator => {
			const indicatorRect = indicator[0].getBoundingClientRect();
			const indicatorBoundary =
				indicatorRect.top + indicatorRect.height / 2;

			expect(indicatorBoundary).to.be.closeTo(expectedTop, 1);
		});
}

function assertDropIndicatorGeometry(expectedInlineStart: number) {
	cy.dataTest('timeline:scroll-content').then(scrollContent => {
		const scrollContentRect =
			scrollContent[0].getBoundingClientRect();

		cy.dataTest('timeline:drop-indicator')
			.should('be.visible')
			.and(indicator => {
				const indicatorRect = indicator[0].getBoundingClientRect();

				expect(
					indicatorRect.left - scrollContentRect.left
				).to.be.closeTo(expectedInlineStart, 1);
				expect(indicatorRect.width).to.be.closeTo(
					scrollContentRect.width - expectedInlineStart,
					1
				);
			});
	});
}

function makeContainerRect(top: number, bottom: number): DOMRect {
	const rect: DOMRect = {
		top,
		bottom,
		left: 0,
		right: 400,
		x: 0,
		y: top,
		width: 400,
		height: bottom - top,
		toJSON: () => ({})
	};

	return rect;
}

describe('Timeline drag and drop', () => {
	beforeEach(() => {
		testStore = createTestStore();
		testStore.dispatch(setActiveScreen(navigationItems.timeline));
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		testStore.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('should compute auto-scroll velocity from pointer position', () => {
		const rect = makeContainerRect(100, 300);
		const contentTop = rect.top + HEADER_HEIGHT;
		const middleY = contentTop + (rect.bottom - contentTop) / 2;

		expect(computeAutoScrollVelocity(rect.top - 100, rect)).to.equal(
			-AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(computeAutoScrollVelocity(rect.top, rect)).to.equal(
			-AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(computeAutoScrollVelocity(contentTop, rect)).to.equal(
			-AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(computeAutoScrollVelocity(rect.bottom, rect)).to.equal(
			AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(
			computeAutoScrollVelocity(rect.bottom + 100, rect)
		).to.equal(AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME);
		expect(computeAutoScrollVelocity(middleY, rect)).to.equal(0);
		expect(
			computeAutoScrollVelocity(
				contentTop + AUTO_SCROLL_EDGE_PX,
				rect
			)
		).to.equal(0);
		expect(
			computeAutoScrollVelocity(
				rect.bottom - AUTO_SCROLL_EDGE_PX,
				rect
			)
		).to.equal(0);
	});

	it('should stop bottom auto-scroll using the scroll content height', () => {
		const diagramContainer = document.createElement('div');
		const scrollContent = document.createElement('div');

		Object.defineProperties(diagramContainer, {
			scrollTop: {value: 80, configurable: true},
			clientHeight: {value: 120, configurable: true},
			scrollHeight: {value: 202, configurable: true}
		});

		scrollContent.getBoundingClientRect = () =>
			makeContainerRect(0, 200);

		expect(
			shouldStopAutoScrollAtBoundary(
				AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME,
				diagramContainer,
				scrollContent
			)
		).to.equal(true);
	});

	it('should flag the dragged row on pointer down and clear it on pointer up', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		assertListOrder(INITIAL_ORDER);

		cy.dataTest('event-sources:item:drag-handle:0')
			.should('exist')
			.then(handle => {
				const rect = handle[0].getBoundingClientRect();

				cy.wrap(handle).trigger('pointerdown', {
					button: 0,
					buttons: 1,
					pointerId: 1,
					pointerType: 'mouse',
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2,
					force: true
				});
			});

		cy.get('body').should('have.class', TIMELINE_DRAG_ACTIVE);

		// Both halves of row 0 must reflect the dragged attribute via the
		// imperative helper. Scoped to the diagram container query.
		cy.dataTest('timeline-diagram')
			.find('[data-row-index="0"][data-row-dragged="true"]')
			.should('have.length.at.least', 2);

		cy.dataTest('event-sources:item:1').trigger('pointerover', {
			pointerId: 1,
			pointerType: 'mouse',
			force: true
		});

		assertListOrder(INITIAL_ORDER);

		// Release pointer anywhere — overlay lifecycle finalizes.
		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();

			cy.window().then(win => {
				const pointerUp = new win.PointerEvent('pointerup', {
					bubbles: true,
					cancelable: true,
					button: 0,
					buttons: 0,
					pointerId: 1,
					pointerType: 'mouse',
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2
				});

				win.dispatchEvent(pointerUp);
			});
		});

		cy.get('body').should('not.have.class', TIMELINE_DRAG_ACTIVE);

		cy.dataTest('timeline-diagram')
			.find('[data-row-dragged="true"]')
			.should('have.length', 0);

		assertListOrder(INITIAL_ORDER);
	});

	it('should show not-allowed outside the diagram and restore the cursor after release', () => {
		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist');
		assertListOrder(INITIAL_ORDER);
		startDraggingRow(0);

		cy.get('body')
			.should('have.class', TIMELINE_DRAG_ACTIVE)
			.and('not.have.class', TIMELINE_DRAG_OUTSIDE);
		cy.dataTest('timeline-diagram').should(
			'have.css',
			'cursor',
			'grabbing'
		);

		cy.dataTest('timeline-diagram:footer').then(footer => {
			const rect = footer[0].getBoundingClientRect();

			dispatchPointerMove(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2
			);
		});

		cy.get('body').should('have.class', TIMELINE_DRAG_OUTSIDE);
		cy.dataTest('timeline-diagram:footer').should(
			'have.css',
			'cursor',
			'not-allowed'
		);

		cy.dataTest('cfs-top-bar:container').then(header => {
			const rect = header[0].getBoundingClientRect();

			dispatchPointerMove(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2
			);
		});

		cy.dataTest('cfs-top-bar:container').should(
			'have.css',
			'cursor',
			'not-allowed'
		);

		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();

			dispatchPointerMove(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2
			);
		});

		cy.get('body').should('not.have.class', TIMELINE_DRAG_OUTSIDE);
		cy.dataTest('timeline-diagram').should(
			'have.css',
			'cursor',
			'grabbing'
		);

		cy.dataTest('timeline-diagram:footer').then(footer => {
			const rect = footer[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top + rect.height / 2;

			dispatchPointerMove(clientX, clientY);
			dispatchPointerUp(clientX, clientY);
		});

		cy.get('body')
			.should('not.have.class', TIMELINE_DRAG_ACTIVE)
			.and('not.have.class', TIMELINE_DRAG_OUTSIDE);
		cy.dataTest('timeline-diagram:footer').should(
			'not.have.css',
			'cursor',
			'not-allowed'
		);
		assertListOrder(INITIAL_ORDER);
	});

	it('should restore the cursor after pointer cancellation outside the diagram', () => {
		cy.mount(<TestComponent />, testStore);
		cy.dataTest('app-content:loading').should('not.exist');
		startDraggingRow(0);

		cy.dataTest('timeline-diagram:footer').then(footer => {
			const rect = footer[0].getBoundingClientRect();

			dispatchPointerMove(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2
			);
		});

		cy.get('body').should('have.class', TIMELINE_DRAG_OUTSIDE);
		dispatchPointerCancel();
		cy.get('body')
			.should('not.have.class', TIMELINE_DRAG_ACTIVE)
			.and('not.have.class', TIMELINE_DRAG_OUTSIDE);
		cy.dataTest('timeline-diagram:footer').should(
			'not.have.css',
			'cursor',
			'not-allowed'
		);
		assertListOrder(INITIAL_ORDER);
	});

	it('should move the floating card on both axes while dragging', () => {
		const deltaX = 80;
		const deltaY = 40;
		let startX = 0;
		let startY = 0;
		let initialLeft = 0;
		let initialTop = 0;

		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist', {
			timeout: 10000
		});

		cy.dataTest('event-sources:item:drag-handle:0')
			.should('exist')
			.then(handle => {
				const rect = handle[0].getBoundingClientRect();
				startX = rect.left + rect.width / 2;
				startY = rect.top + rect.height / 2;

				cy.wrap(handle).trigger('pointerdown', {
					button: 0,
					buttons: 1,
					pointerId: 1,
					pointerType: 'mouse',
					clientX: startX,
					clientY: startY,
					force: true
				});
			});

		cy.dataTest('event-sources:floating-card-overlay')
			.children()
			.first()
			.should('exist')
			.then(floatingCard => {
				const initialRect = floatingCard[0].getBoundingClientRect();
				initialLeft = initialRect.left;
				initialTop = initialRect.top;
			});

		cy.window().then(win => {
			const pointerMove = new win.PointerEvent('pointermove', {
				bubbles: true,
				cancelable: true,
				buttons: 1,
				pointerId: 1,
				pointerType: 'mouse',
				clientX: startX + deltaX,
				clientY: startY + deltaY
			});

			win.dispatchEvent(pointerMove);
		});

		cy.dataTest('event-sources:floating-card-overlay')
			.children()
			.first()
			.should(movedFloatingCard => {
				const movedRect =
					movedFloatingCard[0].getBoundingClientRect();

				expect(movedRect.left).to.be.closeTo(initialLeft + deltaX, 1);
				expect(movedRect.top).to.be.closeTo(initialTop + deltaY, 1);
			});
	});

	it('should size drop feedback for root and nested rows', () => {
		mountTreeTimeline([TARGET_GROUP_ID, NESTED_GROUP_ID]);
		startDraggingNode(MOVABLE_LEAF_ID);

		movePointerOverNode(ROOT_LEAF_ONE_ID, 0.1);
		assertDropIndicatorGeometry(0);

		movePointerOverNode(TARGET_CHILD_ID, 0.1);
		assertDropIndicatorGeometry(36);

		movePointerOverNode(NESTED_CHILD_ID, 0.1);
		assertDropIndicatorGeometry(64);

		movePointerOverNode(ROOT_LEAF_ONE_ID, 0.5);
		cy.dataTest('timeline:drop-indicator').should('not.be.visible');
		cy.dataTest('timeline-diagram')
			.find(
				`[data-row-id="${ROOT_LEAF_ONE_ID}"][data-row-drop-target="true"]`
			)
			.should('have.length', 2);

		movePointerOverNode(ROOT_LEAF_ONE_ID, 0.9);
		assertDropIndicatorGeometry(0);
		cy.dataTest('timeline-diagram')
			.find('[data-row-drop-target="true"]')
			.should('have.length', 0);

		dropOnNode(MOVABLE_LEAF_ID, 0.5);
	});

	it('should refresh the drop indicator when the timeline scrolls without pointer movement', () => {
		cy.viewport(1200, 260);
		mountTreeTimeline();

		// Keep the pointer outside the auto-scroll zones while retaining enough
		// overflow to scroll by one complete row.
		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '160px')
			.invoke('css', 'max-height', '160px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingNode(SOURCE_GROUP_ID);

		let scrollDistance = 0;

		getListRowByNodeId(TARGET_GROUP_ID).then(row => {
			const rect = row[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top + rect.height * 0.1;

			scrollDistance = rect.height;
			dispatchPointerMove(clientX, clientY);

			assertDropIndicatorTop(rect.top);
		});

		cy.then(() => {
			cy.dataTest('timeline-diagram').scrollTo(0, scrollDistance, {
				duration: 0
			});
		});

		// No pointermove is dispatched after the scroll. The hook should
		// reuse the last pointer coordinates and recompute the row beneath it.
		getListRowByNodeId(ROOT_LEAF_ONE_ID).then(nextRow => {
			const nextRect = nextRow[0].getBoundingClientRect();

			assertDropIndicatorTop(nextRect.top);
		});
	});

	it('should commit a reorder when released in the top zone of another row', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		assertListOrder(INITIAL_ORDER);

		startDraggingRow(0);

		cy.dataTest('event-sources:item:2').then(row => {
			const rect = row[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top + rect.height * 0.1;

			dispatchPointerMove(clientX, clientY);
			dispatchPointerUp(clientX, clientY);
		});

		assertListOrder([
			'Event Source Alias 2',
			'Event Source Alias 1',
			'Event Source Alias 3'
		]);

		cy.dataTest('timeline-diagram')
			.find('[data-row-dragged="true"]')
			.should('have.length', 0);
	});

	it('should commit a reorder when released in the bottom zone of another row', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		assertListOrder(INITIAL_ORDER);

		startDraggingRow(0);

		cy.dataTest('event-sources:item:2').then(row => {
			const rect = row[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.bottom - rect.height * 0.1;

			dispatchPointerMove(clientX, clientY);
			dispatchPointerUp(clientX, clientY);
		});

		assertListOrder([
			'Event Source Alias 2',
			'Event Source Alias 3',
			'Event Source Alias 1'
		]);
	});

	it('should not reorder when released over the dragged row itself', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		startDraggingRow(0);

		cy.dataTest('event-sources:item:0').then(row => {
			const rect = row[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top + rect.height / 2;

			dispatchPointerMove(clientX, clientY);
			dispatchPointerUp(clientX, clientY);
		});

		assertListOrder(INITIAL_ORDER);
	});

	it('should not reorder when released outside the diagram', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		startDraggingRow(0);

		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.bottom + 50;

			dispatchPointerMove(clientX, clientY);
			dispatchPointerUp(clientX, clientY);
		});

		assertListOrder(INITIAL_ORDER);

		cy.dataTest('timeline-diagram')
			.find('[data-row-dragged="true"]')
			.should('have.length', 0);
	});

	it('should commit a reorder at the row under the pointer after scrolling', () => {
		cy.viewport(1200, 260);
		mountTreeTimeline();

		// Keep the pointer outside the auto-scroll zones while retaining enough
		// overflow to scroll by one complete row.
		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '160px')
			.invoke('css', 'max-height', '160px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingNode(SOURCE_GROUP_ID);

		let scrollDistance = 0;
		let clientX = 0;
		let clientY = 0;

		getListRowByNodeId(TARGET_GROUP_ID).then(row => {
			const rect = row[0].getBoundingClientRect();
			clientX = rect.left + rect.width / 2;
			clientY = rect.top + rect.height * 0.1;
			scrollDistance = rect.height;

			dispatchPointerMove(clientX, clientY);
			assertDropIndicatorTop(rect.top);
		});

		cy.then(() => {
			cy.dataTest('timeline-diagram').scrollTo(0, scrollDistance, {
				duration: 0
			});
		});

		// The root leaf is now under the unchanged client coordinates.
		getListRowByNodeId(ROOT_LEAF_ONE_ID).then(() => {
			dispatchPointerUp(clientX, clientY);
		});

		assertListOrder([
			'Target Group',
			'Source Group',
			'Root.Leaf.1',
			'Root.Leaf.2',
			'Movable.Leaf'
		]);
	});

	it('should create a group when a leaf is dropped onto a leaf', () => {
		mountTreeTimeline();
		startDraggingNode(MOVABLE_LEAF_ID);
		dropOnNode(ROOT_LEAF_ONE_ID, 0.5);

		assertListOrder([
			'Source Group',
			'Target Group',
			NEW_GROUP_NAME,
			'Root.Leaf.2'
		]);
		assertGroupCollapsed(NEW_GROUP_NAME);

		cy.wrap(testStore).should(store => {
			const tree =
				store.getState().eventSourcesReducer.eventSourceIndex;
			const createdGroup = tree?.find(
				node => node.type === 'group' && node.name === NEW_GROUP_NAME
			);

			expect(createdGroup?.type).to.equal('group');

			if (createdGroup?.type !== 'group') {
				throw new Error('Created group was not found');
			}

			expect(createdGroup.children.map(getNodeLabel)).to.deep.equal([
				'Root.Leaf.1',
				'Movable.Leaf'
			]);
			expect(
				store.getState().timelineReducer.expandedGroupIds[
					createdGroup.id
				]
			).to.equal(undefined);
		});
	});

	it('should create a group when a group is dropped onto a leaf', () => {
		mountTreeTimeline();
		startDraggingNode(SOURCE_GROUP_ID);
		dropOnNode(ROOT_LEAF_ONE_ID, 0.5);

		assertListOrder([
			'Target Group',
			NEW_GROUP_NAME,
			'Root.Leaf.2',
			'Movable.Leaf'
		]);
		assertGroupCollapsed(NEW_GROUP_NAME);

		cy.wrap(testStore).should(store => {
			const tree =
				store.getState().eventSourcesReducer.eventSourceIndex;
			const createdGroup = tree?.find(
				node => node.type === 'group' && node.name === NEW_GROUP_NAME
			);

			expect(createdGroup?.type).to.equal('group');

			if (createdGroup?.type !== 'group') {
				throw new Error('Created group was not found');
			}

			expect(createdGroup.children.map(getNodeLabel)).to.deep.equal([
				'Root.Leaf.1',
				'Source Group'
			]);

			const draggedGroup = createdGroup.children[1];
			expect(draggedGroup?.type).to.equal('group');

			if (draggedGroup?.type !== 'group') {
				throw new Error('Dragged group subtree was not preserved');
			}

			expect(draggedGroup.children.map(getNodeLabel)).to.deep.equal([
				'Source.Child.1',
				'Source.Child.2'
			]);
		});
	});

	it('should indent the lower-zone indicator and insert first in an expanded group', () => {
		mountTreeTimeline([TARGET_GROUP_ID]);
		startDraggingNode(MOVABLE_LEAF_ID);

		movePointerOverNode(TARGET_GROUP_ID, 0.9);
		assertDropIndicatorGeometry(36);
		getListRowByNodeId(TARGET_GROUP_ID).then(row => {
			assertDropIndicatorTop(row[0].getBoundingClientRect().bottom);
		});
		dropOnNode(TARGET_GROUP_ID, 0.9);

		assertListOrder([
			'Source Group',
			'Target Group',
			'Movable.Leaf',
			'Target.Child',
			'Nested Group',
			'Root.Leaf.1',
			'Root.Leaf.2'
		]);
		cy.wrap(testStore).should(store => {
			const targetGroup = store
				.getState()
				.eventSourcesReducer.eventSourceIndex?.find(
					node => node.id === TARGET_GROUP_ID
				);

			expect(targetGroup).to.have.nested.property(
				'children[0].id',
				MOVABLE_LEAF_ID
			);
		});
	});

	it('should indent the lower-zone indicator and insert after a collapsed nested group', () => {
		mountTreeTimeline([TARGET_GROUP_ID]);
		assertGroupCollapsed('Nested Group');
		startDraggingNode(MOVABLE_LEAF_ID);

		movePointerOverNode(NESTED_GROUP_ID, 0.9);
		assertDropIndicatorGeometry(36);
		getListRowByNodeId(NESTED_GROUP_ID).then(row => {
			assertDropIndicatorTop(row[0].getBoundingClientRect().bottom);
		});
		dropOnNode(NESTED_GROUP_ID, 0.9);

		assertListOrder([
			'Source Group',
			'Target Group',
			'Target.Child',
			'Nested Group',
			'Movable.Leaf',
			'Root.Leaf.1',
			'Root.Leaf.2'
		]);
		assertGroupCollapsed('Nested Group');
		cy.wrap(testStore).should(store => {
			const targetGroup = store
				.getState()
				.eventSourcesReducer.eventSourceIndex?.find(
					node => node.id === TARGET_GROUP_ID
				);

			expect(targetGroup).to.have.nested.property(
				'children[1].id',
				NESTED_GROUP_ID
			);
			expect(targetGroup).to.have.nested.property(
				'children[2].id',
				MOVABLE_LEAF_ID
			);
			expect(targetGroup).to.have.nested.property(
				'children[1].children[0].id',
				NESTED_CHILD_ID
			);
		});
	});

	it('should resolve feedback and drops against a tree replaced during dragging', () => {
		mountTreeTimeline([TARGET_GROUP_ID]);
		startDraggingNode(MOVABLE_LEAF_ID);

		cy.then(() => {
			const {eventSources, eventSourceIndex} =
				testStore.getState().eventSourcesReducer;
			if (!eventSourceIndex) return;

			testStore.dispatch(
				setEventSourceData({
					eventSources,
					eventSourceIndex: [
						...eventSourceIndex.slice(1),
						eventSourceIndex[0]
					]
				})
			);
		});
		getListRowByNodeId(TARGET_GROUP_ID).should(
			'have.attr',
			'data-row-index',
			'0'
		);

		movePointerOverNode(TARGET_GROUP_ID, 0.9);
		assertDropIndicatorGeometry(36);
		dropOnNode(TARGET_GROUP_ID, 0.9);

		cy.wrap(testStore).should(store => {
			const targetGroup = store
				.getState()
				.eventSourcesReducer.eventSourceIndex?.find(
					node => node.id === TARGET_GROUP_ID
				);

			expect(targetGroup).to.have.nested.property(
				'children[0].id',
				MOVABLE_LEAF_ID
			);
		});
	});

	it('should append a leaf to an expanded group', () => {
		mountTreeTimeline([TARGET_GROUP_ID]);
		startDraggingNode(MOVABLE_LEAF_ID);
		dropOnNode(TARGET_GROUP_ID, 0.5);

		assertListOrder([
			'Source Group',
			'Target Group',
			'Target.Child',
			'Nested Group',
			'Movable.Leaf',
			'Root.Leaf.1',
			'Root.Leaf.2'
		]);
		getListRowByNodeId(MOVABLE_LEAF_ID).should(
			'have.css',
			'padding-inline-start',
			'0px'
		);

		cy.wrap(testStore).should(store => {
			const state = store.getState();
			const targetGroup =
				state.eventSourcesReducer.eventSourceIndex?.find(
					node => node.id === TARGET_GROUP_ID
				);

			expect(targetGroup?.type).to.equal('group');

			if (targetGroup?.type !== 'group') {
				throw new Error('Target group was not found');
			}

			expect(targetGroup.children.map(getNodeLabel)).to.deep.equal([
				'Target.Child',
				'Nested Group',
				'Movable.Leaf'
			]);
			expect(
				state.timelineReducer.expandedGroupIds[TARGET_GROUP_ID]
			).to.equal(true);
		});
	});

	it('should move a child from its group to the root', () => {
		mountTreeTimeline([SOURCE_GROUP_ID]);
		startDraggingNode(SOURCE_CHILD_ONE_ID);
		dropOnNode(ROOT_LEAF_ONE_ID, 0.1);

		assertListOrder([
			'Source Group',
			'Source.Child.2',
			'Target Group',
			'Source.Child.1',
			'Root.Leaf.1',
			'Root.Leaf.2',
			'Movable.Leaf'
		]);
		getListRowByNodeId(SOURCE_CHILD_ONE_ID).should(
			'have.css',
			'padding-inline-start',
			'0px'
		);

		cy.wrap(testStore).should(store => {
			const tree =
				store.getState().eventSourcesReducer.eventSourceIndex;
			const sourceGroup = tree?.find(
				node => node.id === SOURCE_GROUP_ID
			);

			expect(tree?.map(getNodeLabel)).to.deep.equal([
				'Source Group',
				'Target Group',
				'Source.Child.1',
				'Root.Leaf.1',
				'Root.Leaf.2',
				'Movable.Leaf'
			]);
			expect(sourceGroup?.type).to.equal('group');

			if (sourceGroup?.type !== 'group') {
				throw new Error('Source group was not found');
			}

			expect(sourceGroup.children.map(getNodeLabel)).to.deep.equal([
				'Source.Child.2'
			]);
			expect(sourceGroup.descendantSourceNames).to.deep.equal([
				'Source.Child.2'
			]);
		});
	});

	it('should portal the floating card into the timeline diagram and clip it outside the diagram bounds', () => {
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		startDraggingRow(0);

		cy.dataTest('event-sources:floating-card-overlay')
			.should('exist')
			.then(overlay => {
				cy.dataTest('timeline-diagram').then(diagram => {
					const overlayRect = overlay[0].getBoundingClientRect();
					const diagramRect = diagram[0].getBoundingClientRect();
					const overlayStyle = getComputedStyle(overlay[0]);

					expect(overlay[0].parentElement).to.equal(
						diagram[0].ownerDocument.body
					);
					expect(overlayStyle.position).to.equal('fixed');
					expect(overlayStyle.overflow).to.equal('hidden');
					expect(overlayRect.top).to.be.closeTo(diagramRect.top, 1);
					expect(overlayRect.left).to.be.closeTo(diagramRect.left, 1);
					expect(overlayRect.width).to.be.closeTo(
						diagramRect.width,
						1
					);
					expect(overlayRect.height).to.be.closeTo(
						diagramRect.height,
						1
					);
				});
			});

		cy.dataTest('timeline-diagram').then(diagram => {
			const diagramRect = diagram[0].getBoundingClientRect();

			// Move the pointer above the diagram container. The inner card can
			// move above the overlay, but the fixed overlay clips it to the
			// diagram's viewport bounds.
			dispatchPointerMove(
				diagramRect.left + diagramRect.width / 2,
				diagramRect.top - 24
			);

			cy.dataTest('event-sources:floating-card-overlay').should(
				overlay => {
					const overlayRect = overlay[0].getBoundingClientRect();

					expect(overlayRect.top).to.be.closeTo(diagramRect.top, 1);
					expect(overlayRect.bottom).to.be.closeTo(
						diagramRect.bottom,
						1
					);
				}
			);
		});
	});

	it('should keep the floating card aligned to the pointer after the timeline diagram scrolls', () => {
		cy.viewport(1200, 260);
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '120px')
			.invoke('css', 'max-height', '120px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingRow(0);

		let clientX = 0;
		let clientY = 0;
		let scrollDistance = 0;
		let initialPointerOffsetX = 0;
		let initialPointerOffsetY = 0;

		cy.dataTest('timeline-diagram').then(diagram => {
			const diagramRect = diagram[0].getBoundingClientRect();

			clientX = diagramRect.left + diagramRect.width / 2;
			clientY = diagramRect.top + diagramRect.height / 2;
			scrollDistance = AUTO_SCROLL_EDGE_PX;

			dispatchPointerMove(clientX, clientY);
		});

		cy.dataTest('event-sources:floating-card-overlay')
			.should('exist')
			.then(overlay => {
				const overlayRect = overlay[0].getBoundingClientRect();

				initialPointerOffsetX = overlayRect.left - clientX;
				initialPointerOffsetY = overlayRect.top - clientY;
			});

		cy.then(() => {
			cy.dataTest('timeline-diagram').scrollTo(0, scrollDistance, {
				duration: 0
			});
		});

		// The pointer did not move. The portal target did scroll. The overlay
		// should remain aligned to the same viewport pointer coordinates instead
		// of drifting with the scroll content.
		cy.dataTest('event-sources:floating-card-overlay').should(
			overlay => {
				const overlayRect = overlay[0].getBoundingClientRect();

				expect(overlayRect.left - clientX).to.be.closeTo(
					initialPointerOffsetX,
					1
				);
				expect(overlayRect.top - clientY).to.be.closeTo(
					initialPointerOffsetY,
					1
				);
			}
		);
	});

	it('should auto-scroll down while dragging near the bottom edge', () => {
		cy.viewport(1200, 260);
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '120px')
			.invoke('css', 'max-height', '120px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingRow(0);

		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.bottom - AUTO_SCROLL_EDGE_PX / 2;

			dispatchPointerMove(clientX, clientY);
		});

		cy.dataTest('timeline-diagram').should(diagram => {
			expect(diagram[0].scrollTop).to.be.greaterThan(0);
		});
	});

	it('should continue auto-scrolling down when the pointer leaves below the diagram', () => {
		cy.viewport(1200, 260);
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '120px')
			.invoke('css', 'max-height', '120px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingRow(0);

		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.bottom + 200;

			dispatchPointerMove(clientX, clientY);
		});

		cy.dataTest('timeline-diagram').should(diagram => {
			expect(diagram[0].scrollTop).to.be.greaterThan(0);
		});
	});

	it('should continue auto-scrolling up when the pointer leaves above the diagram', () => {
		cy.viewport(1200, 260);
		cy.mount(<TestComponent />, testStore);

		cy.dataTest('app-content:loading').should('not.exist');

		cy.dataTest('timeline-diagram')
			.invoke('css', 'height', '120px')
			.invoke('css', 'max-height', '120px')
			.should(diagram => {
				expect(diagram[0].scrollHeight).to.be.greaterThan(
					diagram[0].clientHeight
				);
			});

		startDraggingRow(0);

		cy.dataTest('timeline-diagram').scrollTo(0, 60, {duration: 0});

		cy.dataTest('timeline-diagram').then(diagram => {
			const rect = diagram[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top - 200;
			const scrollTopBeforeAutoScroll = diagram[0].scrollTop;

			expect(scrollTopBeforeAutoScroll).to.be.greaterThan(0);
			dispatchPointerMove(clientX, clientY);

			cy.dataTest('timeline-diagram').should(scrolledDiagram => {
				expect(scrolledDiagram[0].scrollTop).to.be.lessThan(
					scrollTopBeforeAutoScroll
				);
			});
		});
	});

	it('should keep a neutral center zone when auto-scroll edge zones would overlap', () => {
		const rect = makeContainerRect(100, 190);
		const contentTop = rect.top + HEADER_HEIGHT;
		const effectiveEdgePx = Math.min(
			AUTO_SCROLL_EDGE_PX,
			(rect.height - HEADER_HEIGHT) / 3
		);

		expect(
			computeAutoScrollVelocity(
				contentTop + effectiveEdgePx / 2,
				rect
			)
		).to.be.lessThan(0);
		expect(
			computeAutoScrollVelocity(contentTop + effectiveEdgePx, rect)
		).to.equal(0);
		expect(
			computeAutoScrollVelocity(
				rect.bottom - effectiveEdgePx / 2,
				rect
			)
		).to.be.greaterThan(0);
	});
});
