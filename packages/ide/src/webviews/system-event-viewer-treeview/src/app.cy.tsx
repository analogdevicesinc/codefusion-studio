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
import {Provider} from 'react-redux';
import EventSourceTreeRow from './components/event-source-tree/event-source-tree-row';
import NodeSiblings from './components/event-source-tree/node-siblings';
import type {EventNode} from './common/utils/types';
import {
	eventTreeReducer,
	setNodeChildren,
	setNodeExpanded,
	setRootChildren,
	setTreeRefreshing
} from './state/slices/event-tree/event-tree.reducer';
import {useTreeRefreshing} from './state/slices/event-tree/event-tree.selector';

type EventTreeFixture = {
	readonly uncheckedEventSource: EventNode;
	readonly disabledEventSource: EventNode;
	readonly collapsedEventGroup: EventNode;
};

type RefreshingTreeRowsProps = {
	readonly nodeIds: string[];
};

function RefreshingTreeRows({nodeIds}: RefreshingTreeRowsProps) {
	const isTreeRefreshing = useTreeRefreshing();

	return (
		<NodeSiblings
			nodeIds={nodeIds}
			depth={0}
			tooltipWidth={300}
			isTreeRefreshing={isTreeRefreshing}
		/>
	);
}

function mountEventSourceTreeRow(
	node: EventNode,
	isActionPending: boolean
) {
	cy.mount(
		<EventSourceTreeRow
			node={node}
			isActionPending={isActionPending}
			isTreeRefreshing={false}
			isExpanded={false}
			tooltipWidth={300}
			onToggle={() => undefined}
			onCheckboxClick={() => undefined}
		/>
	);
}

describe('System Event Viewer tree row states', () => {
	let eventTreeFixture: EventTreeFixture;

	beforeEach(() => {
		cy.viewport(1200, 800);
		eventTreeFixture = {
			uncheckedEventSource: {
				name: 'CPU events',
				path: 'cpu.events',
				isGroup: false,
				treeItem: {
					label: 'CPU events',
					collapsibleState: 0,
					checkboxState: 0
				}
			},
			disabledEventSource: {
				name: 'Unavailable events',
				path: 'cpu.unavailable-events',
				isGroup: false,
				treeItem: {
					label: 'Unavailable events',
					collapsibleState: 0,
					checkboxState: 0,
					isDisabled: true,
					tooltip: 'This event source is unavailable.'
				}
			},
			collapsedEventGroup: {
				name: 'CPU',
				path: 'cpu',
				isGroup: true,
				treeItem: {
					label: 'CPU',
					collapsibleState: 1
				}
			}
		};
	});

	it('Should show a spinner instead of the checkbox while an update is pending', () => {
		const {uncheckedEventSource} = eventTreeFixture;
		mountEventSourceTreeRow(uncheckedEventSource, true);

		cy.dataTest(
			`event-source-tree:spinner:${uncheckedEventSource.path}`
		).should('be.visible');
		cy.dataTest(
			`event-source-tree:checkbox:${uncheckedEventSource.path}`
		).should('not.exist');
	});

	it('Should show the existing checkbox state while no action is pending', () => {
		const {uncheckedEventSource} = eventTreeFixture;
		mountEventSourceTreeRow(uncheckedEventSource, false);

		cy.dataTest(
			`event-source-tree:checkbox:${uncheckedEventSource.path}`
		).should('have.prop', 'checked', false);
	});

	it('Should show a spinner and disable an event group while loading', () => {
		const {collapsedEventGroup} = eventTreeFixture;
		mountEventSourceTreeRow(collapsedEventGroup, true);

		cy.dataTest(
			`event-source-tree:spinner:${collapsedEventGroup.path}`
		).should('be.visible');
		cy.dataTest(
			`event-source-tree:toggle:${collapsedEventGroup.path}`
		).should('be.disabled');
	});

	it('Should show spinners only for visible leaf nodes during a full tree refresh', () => {
		const {
			collapsedEventGroup,
			uncheckedEventSource,
			disabledEventSource
		} = eventTreeFixture;
		const testStore = configureStore({
			reducer: {eventTreeReducer}
		});

		testStore.dispatch(setRootChildren([collapsedEventGroup]));
		testStore.dispatch(
			setNodeChildren({
				parentId: collapsedEventGroup.path,
				children: [uncheckedEventSource, disabledEventSource]
			})
		);
		testStore.dispatch(
			setNodeExpanded({
				nodeId: collapsedEventGroup.path,
				isExpanded: true
			})
		);
		testStore.dispatch(setTreeRefreshing(true));

		cy.mount(
			<Provider store={testStore}>
				<RefreshingTreeRows nodeIds={[collapsedEventGroup.path]} />
			</Provider>
		);

		[uncheckedEventSource, disabledEventSource].forEach(node => {
			cy.dataTest(`event-source-tree:spinner:${node.path}`).should(
				'be.visible'
			);
			cy.dataTest(`event-source-tree:checkbox:${node.path}`).should(
				'not.exist'
			);
		});

		cy.dataTest(
			`event-source-tree:spinner:${collapsedEventGroup.path}`
		).should('not.exist');
		cy.dataTest(
			`event-source-tree:toggle:${collapsedEventGroup.path}`
		)
			.should('be.disabled')
			.find('svg')
			.should('exist');
	});
});
