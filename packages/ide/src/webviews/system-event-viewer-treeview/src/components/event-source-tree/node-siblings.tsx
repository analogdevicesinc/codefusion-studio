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

import {memo, useCallback} from 'react';
import {CheckBox, Tooltip} from 'cfs-react-library';
import {
	useNodeById,
	useNodeChildIds,
	useNodeExpanded,
	useNodeCache
} from '../../state/slices/event-tree/event-tree.selector';
import {toggleNodeExpanded} from '../../state/slices/event-tree/event-tree.reducer';
import {useAppDispatch} from '../../state/store';
import {
	TreeItemCheckboxState,
	TreeItemCollapsibleState
} from '../../common/utils/types';
import type {EventNode} from '../../common/utils/types';

import {setNodeCheckbox} from '../../common/utils/service';
import {loadChildrenByNodeThunk} from '../../state/slices/event-tree/event-tree.thunks';
import ChevronRight from '@common/icons/ChevronRight';
import {SEV_TREE_TOOLTIP_CONTAINER_ID} from '../app-content/app-content';

import styles from './event-source-tree.module.scss';

type NodeSiblingsProps = {
	readonly nodeIds: string[];
	readonly depth: number;
	readonly tooltipWidth: number;
};

type TreeRowProps = {
	readonly nodeId: string;
	readonly depth: number;
	readonly tooltipWidth: number;
};

export const isNodeCollapsible = (
	collapsibleState: TreeItemCollapsibleState | undefined
) =>
	collapsibleState === TreeItemCollapsibleState.Collapsed ||
	collapsibleState === TreeItemCollapsibleState.Expanded;

const isNodeChecked = (node: EventNode) =>
	node.treeItem.checkboxState === TreeItemCheckboxState.Checked;

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
	tooltipWidth
}: NodeSiblingsProps) {
	return (
		<ul
			className={`${depth === 0 ? styles.rootList : ''} ${styles.listContainer}`}
		>
			{nodeIds.map(nodeId => (
				<TreeRow
					key={nodeId}
					nodeId={nodeId}
					depth={depth}
					tooltipWidth={tooltipWidth}
				/>
			))}
		</ul>
	);
}

const TreeRow = memo(
	({nodeId, depth, tooltipWidth}: TreeRowProps) => {
		const dispatch = useAppDispatch();
		const node = useNodeById(nodeId);
		const childIds = useNodeChildIds(nodeId);
		const isExpanded = useNodeExpanded(nodeId);
		const isCache = useNodeCache(nodeId);

		const isGroupNode =
			node.isGroup &&
			isNodeCollapsible(node.treeItem?.collapsibleState);
		const nodeLabel = node.treeItem.label ?? node.name;
		const isNodeDisabled = Boolean(node.treeItem?.isDisabled);

		const listItemClassName = [
			styles.listItem,
			isGroupNode ? styles.listItemInteractive : '',
			!isGroupNode && isNodeDisabled ? styles.listItemDisabled : ''
		]
			.filter(Boolean)
			.join(' ');

		const onToggle = useCallback(async () => {
			if (!node || !node.isGroup) return;

			const isCollapsible = isNodeCollapsible(
				node.treeItem?.collapsibleState
			);

			if (!isCollapsible) return;

			dispatch(toggleNodeExpanded(node.path));

			if (isExpanded || !isGroupNode || isCache) return;

			await dispatch(
				loadChildrenByNodeThunk({parentId: node.path, element: node})
			);
		}, [dispatch, isExpanded, isCache, node, isGroupNode]);

		const onCheckboxChange = useCallback(async () => {
			if (!node || node.isGroup || isNodeDisabled) return;

			await setNodeCheckbox(node, !isNodeChecked(node));
		}, [node, isNodeDisabled]);

		if (!node) return null;

		const groupNode = (
			<button
				type='button'
				className={styles.toggleButton}
				disabled={false}
				onClick={onToggle}
			>
				<span
					className={`${styles.icon} ${isExpanded ? styles.expanded : ''}`}
				>
					<ChevronRight />
				</span>
				<span className={styles.nodeName}>{nodeLabel}</span>
			</button>
		);

		const checkboxElement = (
			<CheckBox
				className={styles.checkbox}
				checked={isNodeChecked(node)}
				isDisabled={isNodeDisabled}
				onChange={onCheckboxChange}
			>
				{nodeLabel}
			</CheckBox>
		);

		const leafNode = (
			<div className={styles.leafRow}>
				{node.treeItem.tooltip ? (
					<Tooltip
						title={node.treeItem.tooltip ?? ''}
						containerId={SEV_TREE_TOOLTIP_CONTAINER_ID}
						position='bottom'
						type='long'
						width={tooltipWidth}
					>
						{checkboxElement}
					</Tooltip>
				) : (
					checkboxElement
				)}
			</div>
		);

		return (
			<li className={listItemClassName}>
				<div className={styles.treeRow}>
					{isGroupNode ? groupNode : leafNode}
				</div>

				{isGroupNode && isExpanded && (
					<div className={styles.childListWithGuide}>
						<NodeSiblings
							nodeIds={childIds}
							depth={depth + 1}
							tooltipWidth={tooltipWidth}
						/>
					</div>
				)}
			</li>
		);
	}
);

export default memo(NodeSiblings);
