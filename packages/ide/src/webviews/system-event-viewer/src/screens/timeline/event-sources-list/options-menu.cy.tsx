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

import {useState} from 'react';
import OptionsMenu from './options-menu';
import {MENU_ACTION} from '../../../common/constants/events';
import type {
	TimelineRow,
	MenuAction
} from '../../../common/types/events';
import {AppContent} from '../../../components/app-content/app-content';
import {configureStore} from '@reduxjs/toolkit';
import {appContextReducer} from '../../../state/slices/app-context/app-context.reducer';
import {
	eventSourcesReducer,
	setEventSourceData
} from '../../../state/slices/event-sources/event-sources.reducer';
import {
	setDataZoom,
	timelineReducer,
	toggleGroupExpanded
} from '../../../state/slices/timeline/timeline.reducer';
import type {CfsEventsDocument} from '../../../common/types/events';
import {
	mapEventSources,
	normalizeEventSourceIndex
} from '../../../common/utils/events';
import {
	DIAGRAM_CHART_ROW_ID,
	INITIAL_DATA_ZOOM
} from '../../../common/constants/timeline';
import {ColorsProvider} from '../../../common/context/colors-provider';

const ROW1_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 1-0`;
const ROW2_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 2-1`;
const ROW3_TEST_ID = `${DIAGRAM_CHART_ROW_ID}:Event Source Alias 3-2`;
const CORE_1_ACTIVITY_GROUP_ID = 'event-source-group:0';
const SINGLE_CHILD_GROUP_ID = 'event-source-group:1';

const TREE_EVENTS = {
	lastUpdate: '2026-08-20T10:00:00.000Z',
	tickFrequency: 1,
	tickEpoch: '2026-08-20T00:00:00.000Z',
	eventSources: {
		'Core1.DMA.Start': {events: [{ts: 1}]},
		'Core1.DMA.Complete': {events: [{ts: 2}]},
		'Core1.Timer': {events: [{ts: 3}]},
		Child1: {events: [{ts: 4}]},
		'Root.Leaf': {events: [{ts: 5}]}
	},
	eventSourceIndex: [
		{
			name: 'Core 1 Activity',
			events: [
				{
					name: 'DMA Transfer',
					events: ['Core1.DMA.Start', 'Core1.DMA.Complete']
				},
				'Core1.Timer',
				{name: 'Unused Channel', events: []}
			]
		},
		{name: 'Single Child Group', events: ['Child1']},
		'Root.Leaf'
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

const mountDefaultTimeline = () => {
	cy.mount(<TestComponent />, testStore);
	cy.dataTest('app-content:loading').should('not.exist');
};

const mountTreeTimeline = () => {
	mountDefaultTimeline();

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
	});

	cy.dataTest('event-sources:item:0').should(
		'contain.text',
		'Core 1 Activity'
	);
};

const expandGroup = (groupId: string, rowIndex: number) => {
	cy.then(() => {
		testStore.dispatch(toggleGroupExpanded(groupId));
	});

	cy.dataTest(`event-sources:group:toggle:${rowIndex}`).should(
		'have.attr',
		'aria-label',
		`Collapse ${
			groupId === CORE_1_ACTIVITY_GROUP_ID
				? 'Core 1 Activity'
				: 'Single Child Group'
		}`
	);
};

const assertVisibleNodeOrder = (expectedNames: string[]) => {
	cy.dataTest('event-sources:item:name').should(nameElements => {
		const actualNames = Array.from(nameElements, nameElement =>
			nameElement.textContent?.trim()
		);

		expect(actualNames).to.deep.equal(expectedNames);
	});
};

const assertChartRowOrder = (expectedOrder: string[]) => {
	expectedOrder.forEach((rowTestId, rowIndex) => {
		cy.dataTest(rowTestId).should(
			'have.attr',
			'data-row-index',
			String(rowIndex)
		);
	});
};

const openOptionsMenu = (rowIndex: number) => {
	cy.dataTest(`event-sources:item:${rowIndex}`).within(() => {
		cy.dataTest('event-sources:options-menu:button').click();
		cy.dataTest('event-sources:options-menu:panel').should(
			'be.visible'
		);
	});
};

const closeOptionsMenuWithEscape = (rowIndex: number) => {
	cy.dataTest(`event-sources:item:${rowIndex}`).within(() => {
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
	});
};

const assertMenuOptions = (
	rowIndex: number,
	expectedActions: string[]
) => {
	const actions = Object.values(MENU_ACTION);

	openOptionsMenu(rowIndex);

	cy.dataTest(`event-sources:item:${rowIndex}`).within(() => {
		actions.forEach(action => {
			cy.dataTest(`event-sources:options-menu:item:${action}`).should(
				expectedActions.includes(action) ? 'be.visible' : 'not.exist'
			);
		});
	});
};

describe('Event Sources Contextual Menu', () => {
	beforeEach(() => {
		testStore = createTestStore();
		cy.viewport(1200, 800);
	});

	afterEach(() => {
		testStore.dispatch(setDataZoom(INITIAL_DATA_ZOOM));
	});

	it('should show the options menu button for leaf and group nodes', () => {
		mountTreeTimeline();

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:options-menu:button').should(
				'be.visible'
			);
		});
		cy.dataTest('event-sources:item:2').within(() => {
			cy.dataTest('event-sources:options-menu:button').should(
				'be.visible'
			);
		});
	});

	it('should offer extraction for a sole child of a group', () => {
		mountTreeTimeline();
		expandGroup(SINGLE_CHILD_GROUP_ID, 1);

		cy.dataTest('event-sources:item:2').within(() => {
			cy.dataTest('event-sources:item:name').should(
				'have.text',
				'Child1'
			);
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest(
				'event-sources:options-menu:item:extractNode'
			).should('be.visible');

			Object.values(MENU_ACTION)
				.filter(action => action !== MENU_ACTION.extractNode)
				.forEach(action => {
					cy.dataTest(
						`event-sources:options-menu:item:${action}`
					).should('not.exist');
				});
		});
	});

	it('should open options menu then close it via ESC', () => {
		mountDefaultTimeline();

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
			cy.dataTest('event-sources:options-menu').then(menuElement => {
				menuElement[0].focus();
			});
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);
		});
	});

	it('should open options menu on first item and select "Move to bottom", then close panel and check', () => {
		mountDefaultTimeline();

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

	it('should update the tree after reordering via contextual menu', () => {
		mountDefaultTimeline();

		// Assert initial diagram row order
		const initialOrder = [ROW1_TEST_ID, ROW2_TEST_ID, ROW3_TEST_ID];
		assertChartRowOrder(initialOrder);

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
		assertVisibleNodeOrder([
			'Event Source Alias 2',
			'Event Source Alias 1',
			'Event Source Alias 3'
		]);

		// Assert diagram rows reflect the same order
		const afterOrder = [ROW2_TEST_ID, ROW1_TEST_ID, ROW3_TEST_ID];
		assertChartRowOrder(afterOrder);

		cy.wrap(testStore).should(store => {
			expect(
				store.getState().eventSourcesReducer.eventSourceIndex
			).to.deep.equal([
				{
					type: 'leaf',
					id: 'Event Source Alias 2-1',
					sourceName: 'Event Source Alias 2'
				},
				{
					type: 'leaf',
					id: 'Event Source Alias 1-0',
					sourceName: 'Event Source Alias 1'
				},
				{
					type: 'leaf',
					id: 'Event Source Alias 3-2',
					sourceName: 'Event Source Alias 3'
				}
			]);
		});
	});

	it('should rename a group from the contextual menu', () => {
		mountTreeTimeline();
		openOptionsMenu(0);

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest(
				'event-sources:options-menu:item:renameGroup'
			).click();

			cy.dataTest('event-sources:group:name-editor-control-input')
				.shadow()
				.find('input')
				.should('have.value', 'Core 1 Activity')
				.clear()
				.type('Renamed Core Activity');

			cy.dataTest('event-sources:group:name-editor:save').click();
			cy.dataTest('event-sources:item:name').should(
				'have.text',
				'Renamed Core Activity'
			);
		});

		cy.wrap(testStore).should(store => {
			expect(
				store.getState().eventSourcesReducer.eventSourceIndex?.[0]
			).to.include({
				type: 'group',
				name: 'Renamed Core Activity'
			});
		});
	});

	it('should cancel renaming a group from the contextual menu', () => {
		mountTreeTimeline();
		openOptionsMenu(0);

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest(
				'event-sources:options-menu:item:renameGroup'
			).click();

			cy.dataTest('event-sources:group:name-editor-control-input')
				.shadow()
				.find('input')
				.clear()
				.type('Discarded Group Name');

			cy.dataTest('event-sources:group:name-editor:cancel').click();
			cy.dataTest('event-sources:group:name-editor').should(
				'not.exist'
			);
			cy.dataTest('event-sources:item:name').should(
				'have.text',
				'Core 1 Activity'
			);
		});
	});

	it('should show sibling-relative options for tree children', () => {
		mountTreeTimeline();
		expandGroup(CORE_1_ACTIVITY_GROUP_ID, 0);

		assertMenuOptions(1, [
			'down',
			'bottom',
			'renameGroup',
			'ungroup',
			'extractNode'
		]);
		closeOptionsMenuWithEscape(1);

		assertMenuOptions(2, [
			'top',
			'up',
			'down',
			'bottom',
			'extractNode'
		]);
		closeOptionsMenuWithEscape(2);

		assertMenuOptions(3, [
			'top',
			'up',
			'renameGroup',
			'ungroup',
			'extractNode'
		]);
		closeOptionsMenuWithEscape(3);
	});

	it('should reorder nodes only within their tree children list', () => {
		mountTreeTimeline();
		expandGroup(CORE_1_ACTIVITY_GROUP_ID, 0);

		openOptionsMenu(1);
		cy.dataTest('event-sources:item:1').within(() => {
			cy.dataTest('event-sources:options-menu:item:bottom').click();
			cy.dataTest('event-sources:options-menu:panel').should(
				'not.exist'
			);
		});

		assertVisibleNodeOrder([
			'Core 1 Activity',
			'Core1.Timer',
			'Unused Channel',
			'DMA Transfer',
			'Single Child Group',
			'Root.Leaf'
		]);

		cy.wrap(testStore).should(store => {
			const eventSourceTree =
				store.getState().eventSourcesReducer.eventSourceIndex;
			const coreActivityGroup = eventSourceTree?.[0];

			expect(coreActivityGroup).to.include({
				type: 'group',
				name: 'Core 1 Activity'
			});
			if (coreActivityGroup?.type !== 'group') return;

			expect(
				coreActivityGroup.children.map(node =>
					node.type === 'leaf' ? node.sourceName : node.name
				)
			).to.deep.equal([
				'Core1.Timer',
				'Unused Channel',
				'DMA Transfer'
			]);
			expect(coreActivityGroup.children[2]).to.deep.include({
				type: 'group',
				name: 'DMA Transfer',
				descendantSourceNames: [
					'Core1.DMA.Start',
					'Core1.DMA.Complete'
				]
			});
		});
	});
});

function TestOptionsMenu({row}: {row: TimelineRow}) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<OptionsMenu
			row={row}
			isPanelOpen={isOpen}
			onToggleMenu={value => setIsOpen(current => value ?? !current)}
			onOptionSelect={() => undefined}
		/>
	);
}

const leafRow: TimelineRow = {
	type: 'leaf',
	id: 'leaf',
	sourceName: 'Leaf',
	depth: 0,
	siblingIndex: 0,
	siblingCount: 3
};
const groupRow: TimelineRow = {
	type: 'group',
	id: 'group',
	name: 'Group',
	descendantSourceNames: ['Leaf'],
	isExpanded: false,
	depth: 0,
	siblingIndex: 0,
	siblingCount: 3
};
const groupActions: MenuAction[] = ['renameGroup', 'ungroup'];

const menuCases: Array<{
	name: string;
	row: TimelineRow;
	actions: MenuAction[];
	separator: boolean;
}> = [
	{
		name: 'root leaf at first position',
		row: leafRow,
		actions: ['down', 'bottom'],
		separator: false
	},
	{
		name: 'root group at first position',
		row: groupRow,
		actions: ['down', 'bottom', ...groupActions],
		separator: true
	},
	{
		name: 'sole root leaf',
		row: {...leafRow, siblingCount: 1},
		actions: [],
		separator: false
	},
	{
		name: 'sole root group',
		row: {...groupRow, siblingCount: 1},
		actions: groupActions,
		separator: false
	},
	{
		name: 'empty root group',
		row: {...groupRow, descendantSourceNames: [], siblingCount: 1},
		actions: groupActions,
		separator: false
	},
	{
		name: 'nested leaf at middle position',
		row: {...leafRow, depth: 1, siblingIndex: 1},
		actions: ['top', 'up', 'down', 'bottom', 'extractNode'],
		separator: true
	},
	{
		name: 'nested group at last position',
		row: {...groupRow, depth: 1, siblingIndex: 2},
		actions: ['top', 'up', ...groupActions, 'extractNode'],
		separator: true
	},
	{
		name: 'sole nested leaf',
		row: {...leafRow, depth: 1, siblingCount: 1},
		actions: ['extractNode'],
		separator: false
	},
	{
		name: 'sole nested group',
		row: {...groupRow, depth: 1, siblingCount: 1},
		actions: [...groupActions, 'extractNode'],
		separator: false
	},
	{
		name: 'deeply nested leaf',
		row: {...leafRow, depth: 3},
		actions: ['down', 'bottom', 'extractNode'],
		separator: true
	},
	{
		name: 'deeply nested empty group',
		row: {...groupRow, depth: 3, descendantSourceNames: []},
		actions: ['down', 'bottom', ...groupActions, 'extractNode'],
		separator: true
	}
];

describe('Options menu visibility rules', () => {
	menuCases.forEach(({name, row, actions, separator}) => {
		it(`should show the correct actions for a ${name}`, () => {
			cy.viewport(1200, 800);
			cy.mount(<TestOptionsMenu row={row} />);

			if (actions.length === 0) {
				cy.dataTest('event-sources:options-menu:button').should(
					'not.exist'
				);

				return;
			}

			cy.dataTest('event-sources:options-menu:button').click();

			Object.values(MENU_ACTION).forEach(action => {
				cy.dataTest(
					`event-sources:options-menu:item:${action}`
				).should(
					actions.includes(action) ? 'be.visible' : 'not.exist'
				);
			});

			cy.dataTest('event-sources:options-menu:separator').should(
				separator ? 'be.visible' : 'not.exist'
			);
		});
	});
});
