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

import {useRef, useState} from 'react';
import {configureStore} from '@reduxjs/toolkit';
import {useAppDispatch, useAppSelector} from '../../../state/store';
import {
	selectEventSourceTree,
	useVisibleTimelineRows
} from '../../../state/slices/event-sources/event-sources.selector';
import {
	timelineReducer,
	toggleGroupExpanded
} from '../../../state/slices/timeline/timeline.reducer';
import {
	eventSourcesReducer,
	setEventSourceTree
} from '../../../state/slices/event-sources/event-sources.reducer';
import {MENU_ACTION} from '../../../common/constants/events';
import {TIMELINE_LIST_MIN_WIDTH} from '../../../common/constants/timeline';
import EventSourceGroup from './event-source-group';
import EventSourcesList from './event-sources-list';
import {moveEventSourceTreeNode} from '../../../common/utils/events-group';
import type {
	EventSourceTreeNode,
	TimelineGroupRow
} from '../../../common/types/events';

import styles from './event-sources-list.module.scss';

const ORIGINAL_GROUP_NAME = 'Core 1 Activity';

function TestEventSourceGroup() {
	const [groupName, setGroupName] = useState(ORIGINAL_GROUP_NAME);
	const isResizingRef = useRef(false);
	const isDraggingRef = useRef(false);

	const row: TimelineGroupRow = {
		siblingIndex: 0,
		siblingCount: 1,
		depth: 0,
		type: 'group',
		name: groupName,
		id: 'event-source-group:0',
		descendantSourceNames: ['First', 'Second'],
		isExpanded: false
	};

	return (
		<div className={styles.listContainer}>
			<section>
				<ul className={styles.list}>
					<EventSourceGroup
						rowIndex={0}
						row={row}
						isResizingRef={isResizingRef}
						isDraggingRef={isDraggingRef}
						onRowStateChange={() => undefined}
						onPointerDown={() => undefined}
						onToggle={() => undefined}
						onRenameGroup={(_groupId, newGroupName) => {
							setGroupName(newGroupName);
						}}
						onMenuOptionSelect={() => undefined}
					/>
				</ul>
			</section>
		</div>
	);
}

const createTestStore = () =>
	configureStore({
		reducer: {eventSourcesReducer, timelineReducer}
	});

const NESTED_TREE: EventSourceTreeNode[] = [
	{
		type: 'group',
		id: 'outer',
		name: 'Outer',
		descendantSourceNames: ['First', 'Second'],
		children: [
			{
				type: 'group',
				id: 'inner',
				name: 'Inner',
				descendantSourceNames: ['First'],
				children: [{type: 'leaf', id: 'first', sourceName: 'First'}]
			},
			{type: 'leaf', id: 'second', sourceName: 'Second'}
		]
	},
	{type: 'leaf', id: 'third', sourceName: 'Third'}
];

function TestEventSourceList() {
	const dispatch = useAppDispatch();
	const tree = useAppSelector(selectEventSourceTree);
	const rows = useVisibleTimelineRows();
	const diagramContainerRef = useRef<HTMLDivElement>(null);
	const isDraggingRef = useRef(false);

	return (
		<div ref={diagramContainerRef}>
			<EventSourcesList
				diagramContainerRef={diagramContainerRef}
				rows={rows}
				isDraggingRef={isDraggingRef}
				onMoveNode={(nodeId, intent) =>
					dispatch(
						setEventSourceTree(
							moveEventSourceTreeNode(tree, nodeId, intent)
						)
					)
				}
				onToggleGroup={id => dispatch(toggleGroupExpanded(id))}
				onRenameGroup={() => undefined}
				onRowStateChange={() => undefined}
				onStartDrag={() => undefined}
			/>
		</div>
	);
}

describe('Event Source List', () => {
	beforeEach(() => {
		cy.viewport(600, 300);
	});

	it('should extract a group to root and preserve its expanded children', () => {
		const store = createTestStore();
		store.dispatch(setEventSourceTree(NESTED_TREE));
		store.dispatch(toggleGroupExpanded('outer'));
		store.dispatch(toggleGroupExpanded('inner'));
		cy.mount(<TestEventSourceList />, store);

		cy.dataTest('event-sources:item:1').within(() => {
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest(
				'event-sources:options-menu:item:extractNode'
			).click();
		});

		cy.dataTest('event-sources:item:name').should(names => {
			expect([...names].map(name => name.textContent)).to.deep.equal([
				'Outer',
				'Second',
				'Inner',
				'First',
				'Third'
			]);
		});

		cy.dataTest('event-sources:group:count:0').should(
			'have.text',
			'1'
		);

		cy.then(() => {
			const nodeIds = store
				.getState()
				.eventSourcesReducer.eventSourceIndex?.map(node => node.id);
			const expandedGroupIds =
				store.getState().timelineReducer.expandedGroupIds;

			expect(nodeIds).to.deep.equal(['outer', 'inner', 'third']);
			expect(expandedGroupIds).to.deep.equal({
				outer: true,
				inner: true
			});
		});
	});

	it('should extract a leaf after its now-empty group', () => {
		const store = createTestStore();
		store.dispatch(setEventSourceTree(NESTED_TREE));
		store.dispatch(toggleGroupExpanded('outer'));
		store.dispatch(toggleGroupExpanded('inner'));
		cy.mount(<TestEventSourceList />, store);

		cy.dataTest('event-sources:item:2').within(() => {
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest(
				'event-sources:options-menu:item:extractNode'
			).click();
		});

		cy.dataTest('event-sources:item:name').should(names => {
			expect([...names].map(name => name.textContent)).to.deep.equal([
				'Outer',
				'Inner',
				'First',
				'Second',
				'Third'
			]);
		});

		cy.dataTest('event-sources:group:count:1').should(
			'have.text',
			'0'
		);

		cy.dataTest('event-sources:group:count:0').should(
			'have.text',
			'2'
		);

		cy.then(() => {
			const outer =
				store.getState().eventSourcesReducer.eventSourceIndex?.[0];

			expect(outer).to.have.nested.property(
				'children[1].id',
				'first'
			);

			expect(
				store.getState().timelineReducer.expandedGroupIds
			).to.deep.equal({outer: true, inner: true});
		});
	});

	it('should replace an ungrouped group with its children in order', () => {
		const store = createTestStore();

		store.dispatch(
			setEventSourceTree([
				{
					type: 'group',
					id: 'group',
					name: 'Group',
					descendantSourceNames: ['First', 'Second'],
					children: [
						{type: 'leaf', id: 'first', sourceName: 'First'},
						{type: 'leaf', id: 'second', sourceName: 'Second'}
					]
				},
				{type: 'leaf', id: 'third', sourceName: 'Third'}
			])
		);
		cy.mount(<TestEventSourceList />, store);

		cy.dataTest('event-sources:item:0').within(() => {
			cy.dataTest('event-sources:options-menu:button').click();
			cy.dataTest('event-sources:options-menu:item:ungroup').click();
		});

		cy.dataTest('event-sources:item:name').then(names => {
			expect([...names].map(name => name.textContent)).to.deep.equal([
				'First',
				'Second',
				'Third'
			]);
		});
		cy.dataTest('event-sources:item:name')
			.contains('Group')
			.should('not.exist');
	});

	it('should clear an ungrouped group from expanded state', () => {
		const store = configureStore({reducer: {timelineReducer}});
		const tree: EventSourceTreeNode[] = [
			{
				type: 'group',
				id: 'group',
				name: 'Group',
				descendantSourceNames: ['First'],
				children: [{type: 'leaf', id: 'first', sourceName: 'First'}]
			}
		];

		store.dispatch(toggleGroupExpanded('group'));
		expect(
			store.getState().timelineReducer.expandedGroupIds
		).to.deep.equal({
			group: true
		});

		store.dispatch(
			setEventSourceTree(
				moveEventSourceTreeNode(tree, 'group', {
					type: 'menu',
					action: MENU_ACTION.ungroup
				})
			)
		);

		expect(
			store.getState().timelineReducer.expandedGroupIds
		).to.deep.equal({});
	});

	it('should keep nested row content before the resizer at minimum width', () => {
		cy.viewport(1000, 400);
		const store = createTestStore();
		store.dispatch(setEventSourceTree(NESTED_TREE));
		cy.mount(<TestEventSourceList />, store);

		cy.dataTest('event-sources:group:toggle:0').click();
		cy.dataTest('event-sources:group:toggle:1').click();
		cy.dataTest('event-sources:item:name').should('have.length', 5);

		cy.dataTest('event-sources:resizer').trigger('mousedown');
		cy.dataTest('event-sources:resizer').trigger('mousemove', {
			movementX: -1000
		});
		cy.dataTest('event-sources:resizer').trigger('mouseup');
		cy.dataTest('event-sources:container').should(
			'have.css',
			'width',
			`${TIMELINE_LIST_MIN_WIDTH}px`
		);

		cy.dataTest('event-sources:resizer').then(resizer => {
			const resizerLeft = resizer[0].getBoundingClientRect().left;

			// Check both the nested group and its leaf, including the menu outside the clip.
			for (const rowIndex of [1, 2]) {
				cy.dataTest(`event-sources:item:${rowIndex}`).within(() => {
					cy.dataTest('event-sources:item:content-viewport').should(
						'have.css',
						'overflow',
						'clip'
					);
					cy.dataTest('event-sources:item:content-viewport').should(
						content => {
							expect(
								content[0].getBoundingClientRect().right
							).to.be.at.most(resizerLeft);
						}
					);
					cy.dataTest('event-sources:options-menu:button').should(
						menu => {
							expect(
								menu[0].getBoundingClientRect().right
							).to.be.at.most(resizerLeft);
						}
					);
				});
			}
		});
	});

	it('should show the rename tooltip after hovering for 300ms and dismiss it on leave', () => {
		cy.clock();
		cy.mount(<TestEventSourceGroup />);
		cy.dataTest('event-sources:item:name').realHover();
		cy.dataTest('event-sources:group:rename').realHover();

		cy.tick(299);
		cy.dataTest('event-sources:group:rename-tooltip').should(
			'not.exist'
		);
		cy.tick(1);
		cy.dataTest('event-sources:group:rename-tooltip')
			.should('be.visible')
			.and('have.text', 'Rename group');

		cy.dataTest('event-sources:item:name').realHover();
		cy.dataTest('event-sources:group:rename-tooltip').should(
			'not.exist'
		);
	});

	it('should show the rename tooltip immediately on focus and dismiss it on blur', () => {
		cy.mount(<TestEventSourceGroup />);
		cy.dataTest('event-sources:group:toggle:0').realClick();
		cy.realPress('Tab');

		// No clock tick: keyboard focus should show the tooltip without the hover delay.
		cy.dataTest('event-sources:group:rename-tooltip')
			.should('be.visible')
			.and('have.text', 'Rename group');

		cy.realPress('Tab');
		cy.dataTest('event-sources:group:rename-tooltip').should(
			'not.exist'
		);
	});

	it('should rename a group using the edit button shown on hover', () => {
		cy.mount(<TestEventSourceGroup />);
		cy.dataTest('event-sources:item:name').realHover();
		cy.dataTest('event-sources:group:rename')
			.should('be.visible')
			.click();

		cy.dataTest('event-sources:group:name-editor-control-input')
			.shadow()
			.find('input')
			.should('have.value', ORIGINAL_GROUP_NAME)
			.clear()
			.type('Renamed Group');

		cy.dataTest('event-sources:group:name-editor:save').click();
		cy.dataTest('event-sources:item:name').should(
			'have.text',
			'Renamed Group'
		);
	});

	it('should cancel renaming from the edit button shown on hover', () => {
		cy.mount(<TestEventSourceGroup />);
		cy.dataTest('event-sources:item:name').realHover();
		cy.dataTest('event-sources:group:rename')
			.should('be.visible')
			.click();

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
			ORIGINAL_GROUP_NAME
		);
	});
});
