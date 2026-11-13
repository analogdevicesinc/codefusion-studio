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

import {useEffect, useRef} from 'react';
import {useAppDispatch} from '../../../../state/store';
import type {SruPeripheralSignalGroup} from '../../../../utils/sru-navigation';
import {partitionDirectionControlInputs} from '../../../../utils/sru-signals';
import {setSelectedSignalGroup} from '../../../../state/slices/sru/sru.reducer';
import {
	useSruSelectedSignalGroupKey,
	useSruSelectionSequence
} from '../../../../state/slices/sru/sru.selector';
import styles from './sru-peripheral-item.module.scss';
import SruSignalCountBadge from './sru-signal-count-badge';
import {Tooltip} from 'cfs-react-library';

type SruPeripheralItemProps = Readonly<{
	signalGroup: SruPeripheralSignalGroup;
}>;

/**
 * Flat row representing a single peripheral signal group in the Connections
 * side panel - either nested inside an expanded SruPeripheralGroup, or, for
 * a peripheral with no group and no subgroups, directly at the top level.
 * Backed by an SRU input/output subgroup (e.g. "SPORT 0A") or, as a
 * fallback, a peripheral's ungrouped signals (named after the peripheral).
 *
 * Selecting the row drives the Connections main panel. A row selected from
 * outside the side panel (e.g. a search result) scrolls itself into view, so
 * the selection is never left below the fold of the scrollable list.
 */
export default function SruPeripheralItem({
	signalGroup
}: SruPeripheralItemProps) {
	const dispatch = useAppDispatch();
	const isSelected =
		useSruSelectedSignalGroupKey() === signalGroup.key;
	const selectionSequence = useSruSelectionSequence();
	const itemRef = useRef<HTMLDivElement>(null);

	const select = () => {
		dispatch(setSelectedSignalGroup(signalGroup.key));
	};

	useEffect(() => {
		if (!isSelected) return;

		itemRef.current?.scrollIntoView({
			behavior: 'instant' as ScrollBehavior,
			block: 'nearest'
		});
		// Keyed on `selectionSequence` rather than `isSelected` so reselecting
		// the same row after the user has scrolled away still re-scrolls it -
		// `isSelected` doesn't change value in that case. Rows revealed by a
		// group that auto-opens on selection scroll on mount instead, since
		// effects always run then. Same rationale as in PeripheralConnections.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectionSequence]);

	return (
		<Tooltip type='short' title={signalGroup.description}>
			<div
				ref={itemRef}
				role='button'
				tabIndex={0}
				aria-current={isSelected}
				className={`${styles.item} ${
					isSelected ? styles.selected : ''
				}`}
				data-test={`sru-peripheral-item:${signalGroup.name}`}
				onClick={select}
				onKeyDown={event => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						select();
					}
				}}
			>
				{signalGroup.label}
				<span className={styles.badges}>
					<SruSignalCountBadge
						direction='input'
						count={
							partitionDirectionControlInputs(signalGroup.inputs)
								.inputs.length
						}
						dataTest={`sru-peripheral-item:${signalGroup.name}:inputs`}
						isHighlighted={isSelected}
					/>
					<SruSignalCountBadge
						direction='output'
						count={signalGroup.outputs.length}
						dataTest={`sru-peripheral-item:${signalGroup.name}:outputs`}
						isHighlighted={isSelected}
					/>
				</span>
			</div>
		</Tooltip>
	);
}
