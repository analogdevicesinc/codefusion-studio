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

import {useEffect, useLayoutEffect, useState} from 'react';
import {useAppDispatch} from '../../state/store';
import {useRootNodeIds} from '../../state/slices/event-tree/event-tree.selector';
import {loadChildrenByNodeThunk} from '../../state/slices/event-tree/event-tree.thunks';
import NodeSiblings from './node-siblings';
import {
	ROOT_NODE_ID,
	TOOLTIP_SIDE_GAP,
	TOOLTIP_MAX_WIDTH
} from '../../common/utils/constants';
import {SEV_TREE_TOOLTIP_CONTAINER_ID} from '../app-content/app-content';

import styles from './event-source-tree.module.scss';

function getTooltipWidth(container: HTMLElement): number {
	if (!container) return 0;

	return Math.min(
		Math.max(0, container.clientWidth - TOOLTIP_SIDE_GAP),
		TOOLTIP_MAX_WIDTH
	);
}

export default function EventSourceTree() {
	const dispatch = useAppDispatch();
	const rootIds = useRootNodeIds();
	const [tooltipWidth, setTooltipWidth] = useState(TOOLTIP_MAX_WIDTH);

	useEffect(() => {
		void dispatch(loadChildrenByNodeThunk({parentId: ROOT_NODE_ID}));
	}, [dispatch]);

	// Effect to update tooltip width on container resize
	useLayoutEffect(() => {
		const container = document.getElementById(
			SEV_TREE_TOOLTIP_CONTAINER_ID
		);

		if (!container) return;

		const updateTooltipWidth = () => {
			const nextWidth = getTooltipWidth(container);

			setTooltipWidth(prev =>
				prev === nextWidth ? prev : nextWidth
			);
		};

		updateTooltipWidth();

		const resizeObserver = new ResizeObserver(updateTooltipWidth);
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div className={styles.treeContainer}>
			<NodeSiblings
				nodeIds={rootIds}
				depth={0}
				tooltipWidth={tooltipWidth}
			/>
		</div>
	);
}
