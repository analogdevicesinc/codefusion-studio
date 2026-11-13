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
	CREATED_GROUP_ID_PREFIX,
	NEW_GROUP_NAME
} from '../constants/events';
import {DROP_ZONE} from '../constants/timeline';
import type {
	EventSourceMoveIntent,
	EventSourceTreeNode,
	SevEventSource,
	TimelineRow
} from '../types/events';
import {MENU_ACTION} from '../constants/events';
import {
	extractTreeNode,
	findTreeNode,
	getDescendantSourceNames,
	moveTreeNode,
	removeTreeNode,
	ungroupTreeNode,
	updateGroupChildren
} from './tree';

type UpdateTreeNodeResult = Readonly<{
	nodes: EventSourceTreeNode[];
	updated: boolean;
}>;

type InsertTreeNodeResult = Readonly<{
	nodes: EventSourceTreeNode[];
	inserted: boolean;
}>;

type DragMoveIntent = Extract<EventSourceMoveIntent, {type: 'drag'}>;

/**
 * Applies a center-zone drop to an event source tree. A group target receives
 * the dragged subtree as its last child; a leaf target is replaced by a new
 * group containing the target leaf followed by the dragged subtree.
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the leaf or group to move.
 * @param targetNodeId ID of the center-drop target.
 * @param createdGroupId UI ID to use if the target is a leaf.
 * @returns The updated tree, or the original tree when no change is possible.
 */
export const moveTreeNodeToTargetCenter = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string,
	targetNodeId: string,
	createdGroupId: string
): EventSourceTreeNode[] => {
	if (nodeId === targetNodeId) return eventSourceTree;

	const draggedNodeLocation = findTreeNode(eventSourceTree, nodeId);
	const targetNodeLocation = findTreeNode(
		eventSourceTree,
		targetNodeId
	);

	if (!draggedNodeLocation || !targetNodeLocation) {
		return eventSourceTree;
	}

	if (
		draggedNodeLocation.node.type === 'group' &&
		findTreeNode(
			draggedNodeLocation.node.children,
			targetNodeId,
			draggedNodeLocation.node.id
		)
	) {
		return eventSourceTree;
	}

	if (
		targetNodeLocation.node.type === 'group' &&
		draggedNodeLocation.parentId === targetNodeId &&
		draggedNodeLocation.siblingIndex ===
			targetNodeLocation.node.children.length - 1
	) {
		return eventSourceTree;
	}

	if (
		targetNodeLocation.node.type === 'leaf' &&
		findTreeNode(eventSourceTree, createdGroupId)
	) {
		return eventSourceTree;
	}

	const removalResult = removeTreeNode(eventSourceTree, nodeId);

	if (!removalResult.removedNode) return eventSourceTree;

	let updateResult;

	if (targetNodeLocation.node.type === 'group') {
		updateResult = appendTreeNodeToGroup(
			removalResult.nodes,
			targetNodeId,
			removalResult.removedNode
		);
	} else {
		updateResult = replaceLeafWithCreatedGroup(
			removalResult.nodes,
			targetNodeId,
			removalResult.removedNode,
			createdGroupId
		);
	}

	return updateResult.updated ? updateResult.nodes : eventSourceTree;
};

/**
 * Recursively finds and updates a node by ID without mutating the original tree.
 * It returns new arrays for the updated branch and preserves unchanged references elsewhere.
 * @param nodes
 * @param targetNodeId
 * @param updateNode
 * @returns The result of the update operation, including the updated tree and a flag indicating if an update occurred.
 */
const updateTreeNodeById = (
	nodes: EventSourceTreeNode[],
	targetNodeId: string,
	updateNode: (
		node: EventSourceTreeNode
	) => EventSourceTreeNode | undefined
): UpdateTreeNodeResult => {
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];

		if (node.id === targetNodeId) {
			const updatedNode = updateNode(node);

			if (!updatedNode || updatedNode === node) {
				return {nodes, updated: false};
			}

			const updatedNodes = [...nodes];
			updatedNodes[index] = updatedNode;

			return {nodes: updatedNodes, updated: true};
		}

		if (node.type === 'leaf') continue;

		const result = updateTreeNodeById(
			node.children,
			targetNodeId,
			updateNode
		);

		if (result.updated) {
			const updatedNodes = [...nodes];
			updatedNodes[index] = updateGroupChildren(node, result.nodes);

			return {nodes: updatedNodes, updated: true};
		}
	}

	return {nodes, updated: false};
};

/**
 * Appends a leaf or group to the target group's children.
 * Only the target must be a group; the node being appended can be either type.
 * @param nodes
 * @param targetGroupId
 * @param nodeToAppend
 * @returns The updated tree with the node appended to the target group.
 */
const appendTreeNodeToGroup = (
	nodes: EventSourceTreeNode[],
	targetGroupId: string,
	nodeToAppend: EventSourceTreeNode
): UpdateTreeNodeResult => {
	const updateNodeFn = (targetNode: EventSourceTreeNode) => {
		if (targetNode.type === 'group') {
			return updateGroupChildren(targetNode, [
				...targetNode.children,
				nodeToAppend
			]);
		}

		return undefined;
	};

	return updateTreeNodeById(nodes, targetGroupId, updateNodeFn);
};

/**
 * Replaces a leaf with a new group containing that leaf first and the dragged leaf or group second.
 * @param nodes
 * @param targetLeafId
 * @param draggedNode
 * @param createdGroupId
 * @returns The updated tree with the new group replacing the target leaf.
 */
const replaceLeafWithCreatedGroup = (
	nodes: EventSourceTreeNode[],
	targetLeafId: string,
	draggedNode: EventSourceTreeNode,
	createdGroupId: string
): UpdateTreeNodeResult => {
	const updateNodeFn = (
		targetNode: EventSourceTreeNode
	): EventSourceTreeNode | undefined => {
		if (targetNode.type === 'group') return undefined;

		const children = [targetNode, draggedNode];

		return {
			type: 'group',
			id: createdGroupId,
			name: NEW_GROUP_NAME,
			children,
			descendantSourceNames: getDescendantSourceNames(children)
		};
	};

	return updateTreeNodeById(nodes, targetLeafId, updateNodeFn);
};

/**
 * Orders the flat event sources by the tree's depth-first leaf order.
 */
export const getEventSourcesInTreeOrder = (
	eventSourceTree: EventSourceTreeNode[],
	eventSources: SevEventSource[]
): SevEventSource[] => {
	const eventSourceById = new Map(
		eventSources.map(eventSource => [eventSource.id, eventSource])
	);
	const orderedEventSources: SevEventSource[] = [];
	const orderedEventSourceIds = new Set<string>();

	const appendEventSources = (nodes: EventSourceTreeNode[]) => {
		for (const node of nodes) {
			if (node.type === 'group') {
				appendEventSources(node.children);

				continue;
			}

			const eventSource = eventSourceById.get(node.id);

			if (eventSource) {
				orderedEventSources.push(eventSource);
				orderedEventSourceIds.add(eventSource.id);
			}
		}
	};

	appendEventSources(eventSourceTree);

	for (const eventSource of eventSources) {
		if (!orderedEventSourceIds.has(eventSource.id)) {
			orderedEventSources.push(eventSource);
		}
	}

	return orderedEventSources;
};

const insertTreeNodeRelativeToTarget = (
	nodes: EventSourceTreeNode[],
	targetNodeId: string,
	nodeToInsert: EventSourceTreeNode,
	position: 'before' | 'after'
): InsertTreeNodeResult => {
	const targetIndex = nodes.findIndex(
		node => node.id === targetNodeId
	);

	if (targetIndex >= 0) {
		const insertionIndex =
			position === 'before' ? targetIndex : targetIndex + 1;
		const updatedNodes = [...nodes];
		updatedNodes.splice(insertionIndex, 0, nodeToInsert);

		return {nodes: updatedNodes, inserted: true};
	}

	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];

		if (node.type === 'leaf') continue;

		const result = insertTreeNodeRelativeToTarget(
			node.children,
			targetNodeId,
			nodeToInsert,
			position
		);

		if (result.inserted) {
			const updatedNodes = [...nodes];
			updatedNodes[index] = updateGroupChildren(node, result.nodes);

			return {nodes: updatedNodes, inserted: true};
		}
	}

	return {nodes, inserted: false};
};

/**
 * Moves a tree node before or after another node, including across parent
 * scopes. Invalid and equivalent moves preserve the original tree reference.
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the leaf or group to move.
 * @param targetNodeId ID of the node that defines the destination.
 * @param position Whether to insert before or after the target.
 * @returns The updated tree, or the original tree when no change is possible.
 */
export const moveTreeNodeRelativeToTarget = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string,
	targetNodeId: string,
	position: 'before' | 'after'
): EventSourceTreeNode[] => {
	if (nodeId === targetNodeId) return eventSourceTree;

	const draggedNodeLocation = findTreeNode(eventSourceTree, nodeId);
	const targetNodeLocation = findTreeNode(
		eventSourceTree,
		targetNodeId
	);

	if (!draggedNodeLocation || !targetNodeLocation) {
		return eventSourceTree;
	}

	if (
		draggedNodeLocation.node.type === 'group' &&
		findTreeNode(
			draggedNodeLocation.node.children,
			targetNodeId,
			draggedNodeLocation.node.id
		)
	) {
		return eventSourceTree;
	}

	if (draggedNodeLocation.parentId === targetNodeLocation.parentId) {
		const targetInsertionIndex =
			position === 'before'
				? targetNodeLocation.siblingIndex
				: targetNodeLocation.siblingIndex + 1;

		const adjustedInsertionIndex =
			targetInsertionIndex > draggedNodeLocation.siblingIndex
				? targetInsertionIndex - 1
				: targetInsertionIndex;

		if (adjustedInsertionIndex === draggedNodeLocation.siblingIndex) {
			return eventSourceTree;
		}
	}

	const removalResult = removeTreeNode(eventSourceTree, nodeId);

	if (!removalResult.removedNode) return eventSourceTree;

	const insertionResult = insertTreeNodeRelativeToTarget(
		removalResult.nodes,
		targetNodeId,
		removalResult.removedNode,
		position
	);

	return insertionResult.inserted
		? insertionResult.nodes
		: eventSourceTree;
};

/**
 * Returns the rows that should be displayed for the current expansion state.
 * Groups are always included; their children are included only when the group is expanded.
 *
 * @param eventSourceTree Event source tree to flatten into timeline rows.
 * @param expandedGroupIds IDs of expanded groups.
 * @returns The visible timeline rows, including their nesting depth and
 * expansion state.
 */
export const getVisibleTimelineRows = (
	eventSourceTree: EventSourceTreeNode[],
	expandedGroupIds: Record<string, true>
): TimelineRow[] => {
	const visibleRows: TimelineRow[] = [];

	/**
	 * Adds tree nodes to the visible timeline rows.
	 * @param nodes Tree nodes to process.
	 * @param depth Current nesting depth of the nodes.
	 */
	const appendVisibleRows = (
		nodes: EventSourceTreeNode[],
		depth: number
	) => {
		let siblingIndex = 0;

		for (const node of nodes) {
			const currentSiblingIndex = siblingIndex;
			siblingIndex += 1;
			const siblingCount = nodes.length;

			if (node.type === 'leaf') {
				visibleRows.push({
					...node,
					depth,
					siblingIndex: currentSiblingIndex,
					siblingCount
				});

				continue;
			}

			const isExpanded = Boolean(expandedGroupIds[node.id]);

			visibleRows.push({
				type: 'group',
				id: node.id,
				name: node.name,
				descendantSourceNames: node.descendantSourceNames,
				depth,
				siblingIndex: currentSiblingIndex,
				siblingCount,
				isExpanded
			});

			if (isExpanded) appendVisibleRows(node.children, depth + 1);
		}
	};

	appendVisibleRows(eventSourceTree, 0);

	return visibleRows;
};

/**
 * Returns the indexes of all visible descendants of an expanded group row.
 * Visible descendants are contiguous and end at the next row at the same or a shallower depth.
 *
 * @param visibleRows Current flattened timeline rows.
 * @param groupRowIndex Index of the potential parent group row.
 * @returns Indexes of the group's visible descendants.
 */
export const getVisibleDescendantRowIndexes = (
	visibleRows: TimelineRow[],
	groupRowIndex: number
): number[] => {
	const groupRow = visibleRows[groupRowIndex];

	if (groupRow?.type !== 'group' || !groupRow.isExpanded) return [];

	const descendantIndexes: number[] = [];

	for (
		let rowIndex = groupRowIndex + 1;
		rowIndex < visibleRows.length;
		rowIndex++
	) {
		if (visibleRows[rowIndex].depth <= groupRow.depth) break;

		descendantIndexes.push(rowIndex);
	}

	return descendantIndexes;
};

const createEventSourceGroupId = (
	eventSourceTree: EventSourceTreeNode[]
): string => {
	let sequence = 1;
	let groupId = `${CREATED_GROUP_ID_PREFIX}${sequence}`;

	while (findTreeNode(eventSourceTree, groupId)) {
		sequence += 1;
		groupId = `${CREATED_GROUP_ID_PREFIX}${sequence}`;
	}

	return groupId;
};

/**
 * Moves a tree node based on a drag-and-drop intent.
 * Drag intent can be at center, above, or below the target node.
 * Center indicates the node should be moved into the target node as a child.
 * Above or below should move the node as sibling to the target node.
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the leaf or group to move.
 * @param intent
 * @returns The updated tree, or the original tree when no change is possible.
 */
const moveTreeNodeFromDragIntent = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string,
	intent: DragMoveIntent
): EventSourceTreeNode[] => {
	if (intent.position === DROP_ZONE.CENTER) {
		return moveTreeNodeToTargetCenter(
			eventSourceTree,
			nodeId,
			intent.targetNodeId,
			createEventSourceGroupId(eventSourceTree)
		);
	}

	return moveTreeNodeRelativeToTarget(
		eventSourceTree,
		nodeId,
		intent.targetNodeId,
		intent.position
	);
};

/**
 * Applies a contextual-menu or drag-and-drop move intent to an event source
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the leaf or group to move.
 * @param intent Contextual-menu or drag-and-drop move intent.
 * @returns The updated tree, or the original tree when no change is possible.
 */
export const moveEventSourceTreeNode = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string,
	intent: EventSourceMoveIntent
): EventSourceTreeNode[] => {
	if (intent.type === 'menu') {
		switch (intent.action) {
			case MENU_ACTION.ungroup:
				return ungroupTreeNode(eventSourceTree, nodeId);
			case MENU_ACTION.extractNode:
				return extractTreeNode(eventSourceTree, nodeId);
			default:
				return moveTreeNode(eventSourceTree, nodeId, intent.action);
		}
	}

	return moveTreeNodeFromDragIntent(eventSourceTree, nodeId, intent);
};
