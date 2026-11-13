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

import {MENU_ACTION as ACTION} from '../constants/events';
import type {EventSourceTreeNode, MenuAction} from '../types/events';

type TreeNodeLocation = Readonly<{
	node: EventSourceTreeNode;
	parentId: string | undefined;
	siblingIndex: number;
}>;

type RemoveTreeNodeResult = Readonly<{
	nodes: EventSourceTreeNode[];
	removedNode?: EventSourceTreeNode;
}>;

export const findTreeNode = (
	nodes: EventSourceTreeNode[],
	nodeId: string,
	parentId?: string
): TreeNodeLocation | undefined => {
	for (
		let siblingIndex = 0;
		siblingIndex < nodes.length;
		siblingIndex++
	) {
		const node = nodes[siblingIndex];

		if (node.id === nodeId) {
			return {node, parentId, siblingIndex};
		}

		if (node.type === 'group') {
			const descendant = findTreeNode(node.children, nodeId, node.id);

			if (descendant) return descendant;
		}
	}

	return undefined;
};

/**
 * Renames a group in the event source tree without changing the original tree.
 *
 * @param eventSourceTree Event source tree to update.
 * @param groupId ID of the group to rename.
 * @param groupName New group name. Surrounding whitespace is removed.
 * @returns The updated tree, or the original tree when the rename is invalid or unnecessary.
 */
export const renameEventSourceGroup = (
	eventSourceTree: EventSourceTreeNode[],
	groupId: string,
	groupName: string
): EventSourceTreeNode[] => {
	const trimmedGroupName = groupName.trim();

	if (!trimmedGroupName) return eventSourceTree;

	const renameGroup = (
		nodes: EventSourceTreeNode[]
	): EventSourceTreeNode[] => {
		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];

			if (node.id === groupId) {
				if (node.type === 'leaf' || node.name === trimmedGroupName) {
					return nodes;
				}

				const updatedNodes = [...nodes];
				updatedNodes[index] = {...node, name: trimmedGroupName};

				return updatedNodes;
			}

			if (node.type === 'leaf') continue;

			const updatedChildren = renameGroup(node.children);

			if (updatedChildren !== node.children) {
				const updatedNodes = [...nodes];
				updatedNodes[index] = {...node, children: updatedChildren};

				return updatedNodes;
			}
		}

		return nodes;
	};

	return renameGroup(eventSourceTree);
};

/**
 * Moves an event source tree node within its immediate sibling list.
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the node to move.
 * @param action Requested sibling movement.
 * @returns The updated tree, or the original tree when no movement is possible.
 */
export const moveTreeNode = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string,
	action: MenuAction
): EventSourceTreeNode[] => {
	const moveNode = (
		nodes: EventSourceTreeNode[]
	): EventSourceTreeNode[] => {
		const nodeIndex = nodes.findIndex(node => node.id === nodeId);

		if (nodeIndex >= 0) {
			let targetIndex = nodeIndex;

			switch (action) {
				case ACTION.top:
					targetIndex = 0;
					break;
				case ACTION.up:
					targetIndex = Math.max(0, nodeIndex - 1);
					break;
				case ACTION.down:
					targetIndex = Math.min(nodes.length - 1, nodeIndex + 1);
					break;
				case ACTION.bottom:
					targetIndex = nodes.length - 1;
					break;
				default:
					return nodes;
			}

			if (targetIndex === nodeIndex) return nodes;

			const updatedNodes = [...nodes];
			const [node] = updatedNodes.splice(nodeIndex, 1);
			updatedNodes.splice(targetIndex, 0, node);

			return updatedNodes;
		}

		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];

			if (node.type === 'leaf') continue;

			const updatedChildren = moveNode(node.children);

			if (updatedChildren !== node.children) {
				const updatedNodes = [...nodes];
				updatedNodes[index] = {
					...node,
					children: updatedChildren
				};

				return updatedNodes;
			}
		}

		return nodes;
	};

	return moveNode(eventSourceTree);
};

/**
 * Replaces a group with its children at the same position in the tree.
 *
 * @param eventSourceTree Event source tree to update.
 * @param groupId ID of the group to ungroup.
 * @returns The updated tree.
 */
export const ungroupTreeNode = (
	eventSourceTree: EventSourceTreeNode[],
	groupId: string
): EventSourceTreeNode[] => {
	const ungroup = (
		nodes: EventSourceTreeNode[]
	): EventSourceTreeNode[] => {
		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];

			if (node.id === groupId && node.type === 'group') {
				return [
					...nodes.slice(0, index),
					...node.children,
					...nodes.slice(index + 1)
				];
			}

			if (node.type === 'leaf') continue;

			const updatedChildren = ungroup(node.children);

			if (updatedChildren !== node.children) {
				const updatedNodes = [...nodes];
				updatedNodes[index] = updateGroupChildren(
					node,
					updatedChildren
				);

				return updatedNodes;
			}
		}

		return nodes;
	};

	return ungroup(eventSourceTree);
};

/**
 * Extracts a node one level up, immediately after its former parent group.
 * Empty groups are retained and unchanged branches preserve their references.
 *
 * @param eventSourceTree Event source tree to update.
 * @param nodeId ID of the leaf or group to extract.
 * @returns The updated tree, or the original tree for root or unknown nodes.
 */
export const extractTreeNode = (
	eventSourceTree: EventSourceTreeNode[],
	nodeId: string
): EventSourceTreeNode[] => {
	for (let index = 0; index < eventSourceTree.length; index++) {
		const group = eventSourceTree[index];
		if (group.type === 'leaf') continue;

		const childIndex = group.children.findIndex(
			child => child.id === nodeId
		);

		if (childIndex >= 0) {
			const children = [...group.children];
			const [extractedNode] = children.splice(childIndex, 1);

			return [
				...eventSourceTree.slice(0, index),
				updateGroupChildren(group, children),
				extractedNode,
				...eventSourceTree.slice(index + 1)
			];
		}

		const children = extractTreeNode(group.children, nodeId);
		if (children !== group.children) {
			const nodes = [...eventSourceTree];
			nodes[index] = updateGroupChildren(group, children);
			return nodes;
		}
	}

	return eventSourceTree;
};

export const removeTreeNode = (
	nodes: EventSourceTreeNode[],
	nodeId: string
): RemoveTreeNodeResult => {
	const nodeIndex = nodes.findIndex(node => node.id === nodeId);

	if (nodeIndex >= 0) {
		const updatedNodes = [...nodes];
		const [removedNode] = updatedNodes.splice(nodeIndex, 1);

		return {nodes: updatedNodes, removedNode};
	}

	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];

		if (node.type === 'leaf') continue;

		const result = removeTreeNode(node.children, nodeId);

		if (result.removedNode) {
			const updatedNodes = [...nodes];
			updatedNodes[index] = updateGroupChildren(node, result.nodes);

			return {nodes: updatedNodes, removedNode: result.removedNode};
		}
	}

	return {nodes};
};

export const updateGroupChildren = (
	group: Extract<EventSourceTreeNode, {type: 'group'}>,
	children: EventSourceTreeNode[]
): EventSourceTreeNode => ({
	...group,
	children,
	descendantSourceNames: getDescendantSourceNames(children)
});

export const getDescendantSourceNames = (
	children: EventSourceTreeNode[]
): string[] =>
	children.flatMap(child =>
		child.type === 'leaf'
			? [child.sourceName]
			: child.descendantSourceNames
	);
