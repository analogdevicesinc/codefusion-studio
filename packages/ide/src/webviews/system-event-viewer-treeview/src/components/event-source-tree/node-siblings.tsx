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

import {memo, useCallback, useState} from 'react';
import {
	useNodeById,
	useNodeChildIds,
	useNodeExpanded,
	useNodeCache
} from '../../state/slices/event-tree/event-tree.selector';
import {toggleNodeExpanded} from '../../state/slices/event-tree/event-tree.reducer';
import {useAppDispatch} from '../../state/store';
import {setNodeCheckbox} from '../../common/utils/service';
import {loadChildrenByNodeThunk} from '../../state/slices/event-tree/event-tree.thunks';
import EventSourceTreeRow, {
	isNodeChecked,
	isNodeCollapsible
} from './event-source-tree-row';

import styles from './event-source-tree.module.scss';

type NodeSiblingsProps = {
	readonly nodeIds: string[];
	readonly depth: number;
	readonly tooltipWidth: number;
	readonly isTreeRefreshing: boolean;
};

type ConnectedTreeRowProps = {
	readonly nodeId: string;
	readonly depth: number;
	readonly tooltipWidth: number;
	readonly isTreeRefreshing: boolean;
};

/**
 * This is a recursive component that renders a list of sibling nodes.
 * It is used to render the tree structure of the event source tree.
 * It receives a list of node IDs and the depth of the nodes in the tree.
 * It renders a TreeRow for each node ID and if the node is expanded,
 * it renders another NodeSiblings component for the child nodes.
 * @param param0
 * @returns
 */
function NodeSiblings({
	nodeIds,
	depth,
	tooltipWidth,
	isTreeRefreshing
}: NodeSiblingsProps) {
	return (
		<ul
			className={`${depth === 0 ? styles.rootList : ''} ${
				styles.listContainer
			}`}
		>
			{nodeIds.map(nodeId => (
				<ConnectedTreeRow
					key={nodeId}
					nodeId={nodeId}
					depth={depth}
					tooltipWidth={tooltipWidth}
					isTreeRefreshing={isTreeRefreshing}
				/>
			))}
		</ul>
	);
}

const ConnectedTreeRow = memo(
	({
		nodeId,
		depth,
		tooltipWidth,
		isTreeRefreshing
	}: ConnectedTreeRowProps) => {
		const dispatch = useAppDispatch();
		const node = useNodeById(nodeId);
		const childIds = useNodeChildIds(nodeId);
		const isExpanded = useNodeExpanded(nodeId);
		const isCache = useNodeCache(nodeId);
		const [isActionPending, setIsActionPending] = useState(false);

		const isNodeDisabled = Boolean(node?.treeItem?.isDisabled);

		const onToggle = useCallback(async () => {
			if (
				!node ||
				!node.isGroup ||
				isActionPending ||
				isTreeRefreshing
			) {
				return;
			}

			if (!isNodeCollapsible(node.treeItem?.collapsibleState)) return;

			if (isExpanded || isCache) {
				dispatch(toggleNodeExpanded(node.path));

				return;
			}

			setIsActionPending(true);

			try {
				await dispatch(
					loadChildrenByNodeThunk({
						parentId: node.path,
						element: node
					})
				).unwrap();

				dispatch(toggleNodeExpanded(node.path));
			} catch {
				// Keep the group collapsed when loading its children fails.
			} finally {
				setIsActionPending(false);
			}
		}, [
			dispatch,
			isExpanded,
			isCache,
			node,
			isActionPending,
			isTreeRefreshing
		]);

		const onCheckboxClick = useCallback(async () => {
			if (
				!node ||
				node.isGroup ||
				isNodeDisabled ||
				isActionPending ||
				isTreeRefreshing
			) {
				return;
			}

			setIsActionPending(true);

			try {
				await setNodeCheckbox(node, !isNodeChecked(node));
			} catch {
				// Keep the current checkbox state when the request fails.
			} finally {
				setIsActionPending(false);
			}
		}, [isActionPending, isNodeDisabled, isTreeRefreshing, node]);

		if (!node) return null;

		return (
			<EventSourceTreeRow
				node={node}
				isActionPending={isActionPending}
				isTreeRefreshing={isTreeRefreshing}
				isExpanded={isExpanded}
				tooltipWidth={tooltipWidth}
				onToggle={onToggle}
				onCheckboxClick={onCheckboxClick}
			>
				<NodeSiblings
					nodeIds={childIds}
					depth={depth + 1}
					tooltipWidth={tooltipWidth}
					isTreeRefreshing={isTreeRefreshing}
				/>
			</EventSourceTreeRow>
		);
	}
);

export default memo(NodeSiblings);
