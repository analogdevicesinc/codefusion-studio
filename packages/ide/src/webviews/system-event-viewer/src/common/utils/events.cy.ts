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

import {
	getVisibleAnchorRowIds,
	normalizeEventSourceIndex
} from './events';
import {
	getEventSourcesInTreeOrder,
	getVisibleDescendantRowIndexes,
	getVisibleTimelineRows,
	moveTreeNodeRelativeToTarget,
	moveTreeNodeToTargetCenter
} from './events-group';

import type {
	CfsEventSourceIndexEntry,
	EventSourceTreeNode,
	SevEventSource
} from '../types/events';

const eventSources: SevEventSource[] = [
	{id: 'source-a-0', name: 'source-a', checked: true, timestamps: []},
	{id: 'source-b-1', name: 'source-b', checked: true, timestamps: []},
	{id: 'source-c-2', name: 'source-c', checked: true, timestamps: []}
];

const createEventSourceTree = (): EventSourceTreeNode[] => [
	{
		type: 'group',
		id: 'outer-group',
		name: 'Outer group',
		descendantSourceNames: ['source-a', 'source-b'],
		children: [
			{
				type: 'leaf',
				id: 'source-a-0',
				sourceName: 'source-a'
			},
			{
				type: 'group',
				id: 'inner-group',
				name: 'Inner group',
				descendantSourceNames: ['source-b'],
				children: [
					{
						type: 'leaf',
						id: 'source-b-1',
						sourceName: 'source-b'
					}
				]
			}
		]
	},
	{
		type: 'leaf',
		id: 'source-c-2',
		sourceName: 'source-c'
	}
];

describe('Event source layout', () => {
	it('should normalize nested groups and append omitted sources', () => {
		const index: CfsEventSourceIndexEntry[] = [
			{
				name: 'group',
				events: [
					'source-b',
					{name: 'group', events: ['unknown', 'source-a']},
					'source-b'
				]
			},
			{name: 'empty', events: []}
		];

		const layout = normalizeEventSourceIndex(index, eventSources);

		expect(layout).to.deep.equal([
			{
				type: 'group',
				id: 'event-source-group:0',
				name: 'group',
				descendantSourceNames: ['source-b', 'source-a'],
				children: [
					{
						type: 'leaf',
						id: 'source-b-1',
						sourceName: 'source-b'
					},
					{
						type: 'group',
						id: 'event-source-group:0.1',
						name: 'group',
						descendantSourceNames: ['source-a'],
						children: [
							{
								type: 'leaf',
								id: 'source-a-0',
								sourceName: 'source-a'
							}
						]
					}
				]
			},
			{
				type: 'group',
				id: 'event-source-group:1',
				name: 'empty',
				descendantSourceNames: [],
				children: []
			},
			{
				type: 'leaf',
				id: 'source-c-2',
				sourceName: 'source-c'
			}
		]);
	});

	it('should return only root rows when all groups are collapsed', () => {
		const layout =
			normalizeEventSourceIndex(
				[{name: 'group', events: ['source-a']}],
				eventSources
			) ?? [];

		expect(
			getVisibleTimelineRows(layout, {}).map(row => ({
				type: row.type,
				depth: row.depth
			}))
		).to.deep.equal([
			{type: 'group', depth: 0},
			{type: 'leaf', depth: 0},
			{type: 'leaf', depth: 0}
		]);
	});

	it('should flatten expanded nested groups in exact order', () => {
		const layout = normalizeEventSourceIndex(
			[
				{
					name: 'outer',
					events: ['source-b', {name: 'inner', events: ['source-a']}]
				}
			],
			eventSources
		);

		const rows = getVisibleTimelineRows(layout ?? [], {
			'event-source-group:0': true,
			'event-source-group:0.1': true
		});

		expect(
			rows.map(row => [row.type, row.id, row.depth])
		).to.deep.equal([
			['group', 'event-source-group:0', 0],
			['leaf', 'source-b-1', 1],
			['group', 'event-source-group:0.1', 1],
			['leaf', 'source-a-0', 2],
			['leaf', 'source-c-2', 0]
		]);
	});

	it('should fall back to the flat source order without an index', () => {
		const rows = getVisibleTimelineRows(
			eventSources.map(eventSource => ({
				type: 'leaf',
				id: eventSource.id,
				sourceName: eventSource.name
			})),
			{}
		);

		expect(rows.map(row => row.id)).to.deep.equal([
			'source-a-0',
			'source-b-1',
			'source-c-2'
		]);
	});
});

describe('Visible measurement anchors', () => {
	it('should map hidden nested rows to their nearest collapsed ancestor', () => {
		const layout = normalizeEventSourceIndex(
			[
				{
					name: 'outer',
					events: ['source-a', {name: 'inner', events: ['source-b']}]
				}
			],
			eventSources
		);
		const anchors = getVisibleAnchorRowIds(layout ?? [], {
			'event-source-group:0': true
		});

		expect(anchors.get('source-a-0')).to.equal('source-a-0');
		expect(anchors.get('event-source-group:0.1')).to.equal(
			'event-source-group:0.1'
		);
		expect(anchors.get('source-b-1')).to.equal(
			'event-source-group:0.1'
		);
	});
});

describe('Event source tree', () => {
	it('should append a leaf to a nested group and refresh ancestor source names', () => {
		const tree = moveTreeNodeToTargetCenter(
			createEventSourceTree(),
			'source-c-2',
			'inner-group',
			'unused-group-id'
		);
		const outerGroup = tree[0];

		expect(outerGroup.type).to.equal('group');

		if (outerGroup.type !== 'group') {
			throw new Error('Outer group was not found');
		}

		const innerGroup = outerGroup.children[1];

		expect(innerGroup.type).to.equal('group');

		if (innerGroup.type !== 'group') {
			throw new Error('Inner group was not found');
		}

		expect(innerGroup.children.map(node => node.id)).to.deep.equal([
			'source-b-1',
			'source-c-2'
		]);
		expect(innerGroup.descendantSourceNames).to.deep.equal([
			'source-b',
			'source-c'
		]);
		expect(outerGroup.descendantSourceNames).to.deep.equal([
			'source-a',
			'source-b',
			'source-c'
		]);
	});

	it('should replace a leaf with a group after moving a nested leaf', () => {
		const tree = moveTreeNodeToTargetCenter(
			createEventSourceTree(),
			'source-b-1',
			'source-c-2',
			'created-group'
		);
		const outerGroup = tree[0];
		const createdGroup = tree[1];

		expect(outerGroup.type).to.equal('group');
		expect(createdGroup.type).to.equal('group');

		if (
			outerGroup.type !== 'group' ||
			createdGroup.type !== 'group'
		) {
			throw new Error('Expected groups were not found');
		}

		expect(outerGroup.descendantSourceNames).to.deep.equal([
			'source-a'
		]);
		expect(createdGroup.children.map(node => node.id)).to.deep.equal([
			'source-c-2',
			'source-b-1'
		]);
		expect(createdGroup.descendantSourceNames).to.deep.equal([
			'source-c',
			'source-b'
		]);
	});

	it('should reject moving a group relative to one of its descendants', () => {
		const tree = createEventSourceTree();
		const result = moveTreeNodeRelativeToTarget(
			tree,
			'outer-group',
			'source-b-1',
			'after'
		);

		expect(result).to.equal(tree);
	});

	it('should order sources by tree leaves and append sources missing from the tree', () => {
		const orderedSources = getEventSourcesInTreeOrder(
			[
				{
					type: 'leaf',
					id: 'source-b-1',
					sourceName: 'source-b'
				},
				{
					type: 'leaf',
					id: 'source-a-0',
					sourceName: 'source-a'
				}
			],
			eventSources
		);

		expect(orderedSources.map(source => source.id)).to.deep.equal([
			'source-b-1',
			'source-a-0',
			'source-c-2'
		]);
	});

	it('should return all visible descendant indexes of an expanded group', () => {
		const visibleRows = getVisibleTimelineRows(
			createEventSourceTree(),
			{
				'outer-group': true,
				'inner-group': true
			}
		);

		expect(
			getVisibleDescendantRowIndexes(visibleRows, 0)
		).to.deep.equal([1, 2, 3]);
		expect(
			getVisibleDescendantRowIndexes(visibleRows, 2)
		).to.deep.equal([3]);
		expect(
			getVisibleDescendantRowIndexes(visibleRows, 4)
		).to.deep.equal([]);
	});
});
