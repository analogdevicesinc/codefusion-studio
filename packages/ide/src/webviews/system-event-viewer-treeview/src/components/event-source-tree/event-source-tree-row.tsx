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

import type {ReactNode} from 'react';
import {CheckBox, Tooltip} from 'cfs-react-library';
import ChevronRight from '@common/icons/ChevronRight';
import {Spinner} from '@common/components/spinner/Spinner';
import {
	TreeItemCheckboxState,
	TreeItemCollapsibleState,
	type EventNode
} from '../../common/utils/types';
import {SEV_TREE_TOOLTIP_CONTAINER_ID} from '../app-content/app-content';

import styles from './event-source-tree.module.scss';

type EventSourceTreeRowProps = {
	readonly node: EventNode;
	readonly isActionPending: boolean;
	readonly isTreeRefreshing: boolean;
	readonly isExpanded: boolean;
	readonly tooltipWidth: number;
	readonly onToggle: () => void;
	readonly onCheckboxClick: () => void;
	readonly children?: ReactNode;
};

export const isNodeCollapsible = (
	collapsibleState: TreeItemCollapsibleState | undefined
) =>
	collapsibleState === TreeItemCollapsibleState.Collapsed ||
	collapsibleState === TreeItemCollapsibleState.Expanded;

export const isNodeChecked = (node: EventNode) =>
	node.treeItem.checkboxState === TreeItemCheckboxState.Checked;

export default function EventSourceTreeRow({
	node,
	isActionPending,
	isTreeRefreshing,
	isExpanded,
	tooltipWidth,
	onToggle,
	onCheckboxClick,
	children
}: EventSourceTreeRowProps) {
	const isGroupNode =
		node.isGroup &&
		isNodeCollapsible(node.treeItem?.collapsibleState);
	const nodeLabel = node.treeItem.label ?? node.name;
	const isNodeDisabled = Boolean(node.treeItem?.isDisabled);
	const isLeafPending = isActionPending || isTreeRefreshing;
	const listItemClassName = [
		styles.listItem,
		isGroupNode ? styles.listItemInteractive : '',
		!isGroupNode && isNodeDisabled ? styles.listItemDisabled : ''
	]
		.filter(Boolean)
		.join(' ');

	const spinner = (
		<span
			className={styles.pendingSpinner}
			data-test={`event-source-tree:spinner:${node.path}`}
		>
			<Spinner />
		</span>
	);

	const pendingCheckbox = (
		<div className={styles.pendingCheckbox}>
			{spinner}
			<span className={styles.pendingCheckboxLabel}>{nodeLabel}</span>
		</div>
	);

	const groupNode = (
		<button
			type='button'
			className={styles.toggleButton}
			data-test={`event-source-tree:toggle:${node.path}`}
			disabled={isActionPending || isTreeRefreshing}
			onClick={onToggle}
		>
			<span
				className={`${styles.icon} ${
					isExpanded ? styles.expanded : ''
				}`}
			>
				{isActionPending ? spinner : <ChevronRight />}
			</span>
			<span className={styles.nodeName}>{nodeLabel}</span>
		</button>
	);

	const checkboxElement = (
		<CheckBox
			className={styles.checkbox}
			dataTest={`event-source-tree:checkbox:${node.path}`}
			checked={isNodeChecked(node)}
			isDisabled={isNodeDisabled}
			onClick={onCheckboxClick}
		>
			{nodeLabel}
		</CheckBox>
	);

	const leafNode = (
		<div className={styles.leafRow}>
			{isLeafPending ? (
				pendingCheckbox
			) : node.treeItem.tooltip ? (
				<Tooltip
					title={node.treeItem.tooltip}
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
		<li
			className={listItemClassName}
			data-test={`event-source-tree:node:${node.path}`}
		>
			<div className={styles.treeRow}>
				{isGroupNode ? groupNode : leafNode}
			</div>

			{isGroupNode && isExpanded && (
				<div className={styles.childListWithGuide}>{children}</div>
			)}
		</li>
	);
}
