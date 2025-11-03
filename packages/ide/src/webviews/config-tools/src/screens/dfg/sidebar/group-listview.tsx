/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {Button} from 'cfs-react-library';
import {useMemo, useState} from 'react';

import type {DFGStream} from 'cfs-plugins-api';
import Accordion from '../../../../../common/components/accordion/Accordion';
import PlusIcon from '../../../../../common/components/icons/PlusIcon';
import SmallSettingsIcon from '../../../../../common/components/icons/SamllSettingsIcon';
import SmallArrowRightIcon from '../../../../../common/components/icons/SmallArrowRightIcon';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {
	setEditingStream,
	setHoveredStream,
	setSelectedStreams
} from '../../../state/slices/gaskets/gasket.reducer';
import {useStreamErrors} from '../../../state/slices/gaskets/gasket.selector';
import {useAppDispatch} from '../../../state/store';
import {useFilteredStreams} from '../hooks/useFilteredStreams';
import styles from './stream-sidebar.module.scss';

export type StreamGroupListViewProps = {
	readonly groupName: string;
	readonly streams: DFGStream[];
	readonly allStreams: DFGStream[];
};

export function StreamGroupListView({
	groupName,
	streams,
	allStreams
}: StreamGroupListViewProps) {
	const [expanded, setExpanded] = useState<boolean>(false);

	const dispatch = useAppDispatch();

	const handlePlusClick = (
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		dispatch(
			setEditingStream({
				// Ungrouped is a special case, it should be empty
				Group:
					groupName.toUpperCase() === 'UNGROUPED' ? '' : groupName
			})
		);
	};

	return (
		<Accordion
			key={groupName}
			title={groupName}
			caption={
				<div className={styles.captionContainer}>
					<div
						className={styles.inOutDisplay}
						style={{minWidth: '24px'}}
					>
						<div
							className={styles.inOutBubble}
							data-test={`accordion-group-length:${groupName}`}
						>
							{streams.length !== allStreams.length
								? `${streams.length}/${allStreams.length}`
								: streams.length}
						</div>
					</div>
					{/* Plus Icon */}
					<Button appearance='icon' onClick={handlePlusClick}>
						<PlusIcon />
					</Button>
				</div>
			}
			isOpen={expanded}
			toggleExpand={() => {
				setExpanded(!expanded);
			}}
			data-test={`accordion-toggle:${groupName}`}
			body={
				<div className={styles.streamList}>
					{streams.map(stream => (
						<StreamListView key={stream.StreamId} stream={stream} />
					))}
				</div>
			}
		/>
	);
}

function StreamListView({stream}: {readonly stream: DFGStream}) {
	const dispatch = useAppDispatch();

	const handleClick = () => {
		dispatch(setEditingStream(stream));
		dispatch(setSelectedStreams([stream]));
	};

	const handleMouseEnter = () => {
		dispatch(setHoveredStream(stream));
	};

	const handleMouseLeave = () => {
		dispatch(setHoveredStream(undefined));
	};

	const streamErrors = useStreamErrors();
	const errors = streamErrors[stream.StreamId] ?? [];

	return (
		<div
			className={styles.streamListItemGroup}
			data-test={`stream-${stream.StreamId}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* SRC -> DEST */}
			<span
				className={styles.streamListItemGasket}
				data-test={`stream-${stream.StreamId}-source-gasket`}
			>
				{stream.Source.Gasket}
			</span>
			<SmallArrowRightIcon />
			<span
				className={styles.streamListItemGasket}
				data-test={`stream-${stream.StreamId}-destination-gasket`}
			>
				{stream.Destinations.map(d => d.Gasket).join(', ')}
			</span>
			<span
				className={styles.streamListItemDescription}
				data-test={`stream-${stream.StreamId}-description`}
			>
				#{stream.StreamId} {stream.Description}
			</span>
			<Button
				appearance='icon'
				className={styles.streamListItemButton}
				data-test={`stream-${stream.StreamId}-edit-button`}
				onClick={handleClick}
			>
				<SmallSettingsIcon />
			</Button>
			{errors.length > 0 ? (
				<div
					data-test={`stream-${stream.StreamId}-error`}
					id={`stream-${stream.StreamId}-error`}
					className={styles.streamErrorIcon}
				>
					<ConflictIcon width='16' height='16' />
				</div>
			) : (
				<div className={styles.streamErrorIconPlaceholder} />
			)}
		</div>
	);
}

export type StreamGroupProps = {
	readonly streams: DFGStream[];
};

export function StreamGroup({streams}: StreamGroupProps) {
	// Apply search filtering to streams
	const filteredStreams = useFilteredStreams(streams);

	const groupedStreams = useMemo(() => {
		const groupedFilteredStreams: Record<string, DFGStream[]> = {};
		const groupedAllStreams: Record<string, DFGStream[]> = {};

		// Group filtered streams
		filteredStreams.forEach(stream => {
			const groupName = stream.Group || 'UNGROUPED';
			groupedFilteredStreams[groupName] = [
				...(groupedFilteredStreams[groupName] || []),
				stream
			];
		});

		// Group all streams for counts
		streams.forEach(stream => {
			const groupName = stream.Group || 'UNGROUPED';
			groupedAllStreams[groupName] = [
				...(groupedAllStreams[groupName] || []),
				stream
			];
		});

		/**
		 * Sort streams within each group by:
		 * 1. Input gasket name (Source.Gasket)
		 * 2. Output gasket name (Destinations[0].Gasket)
		 * 3. Stream alias (Description)
		 */
		const sortStreams = (streams: DFGStream[]) => {
			return streams.sort((a, b) => {
				// First, sort by input gasket name
				const inputComparison = a.Source.Gasket.localeCompare(
					b.Source.Gasket
				);
				if (inputComparison !== 0) return inputComparison;

				// Then, sort by output gasket name
				const outputComparison =
					a.Destinations[0].Gasket.localeCompare(
						b.Destinations[0].Gasket
					);
				if (outputComparison !== 0) return outputComparison;

				// Finally, sort by stream alias (Description)
				return a.Description.localeCompare(b.Description);
			});
		};

		Object.keys(groupedFilteredStreams).forEach(groupName => {
			groupedFilteredStreams[groupName] = sortStreams(
				groupedFilteredStreams[groupName]
			);
		});

		// Get all group names from both filtered and all streams
		const allGroupNames = new Set([
			...Object.keys(groupedFilteredStreams),
			...Object.keys(groupedAllStreams)
		]);

		// Sort groups alphabetically A->Z, with UNGROUPED at the end
		const sortedGroupNames = Array.from(allGroupNames).sort(
			(groupNameA, groupNameB) => {
				// Put UNGROUPED at the end
				if (groupNameA === 'UNGROUPED' && groupNameB !== 'UNGROUPED')
					return 1;
				if (groupNameB === 'UNGROUPED' && groupNameA !== 'UNGROUPED')
					return -1;

				// Alphabetical sorting for all other groups
				return groupNameA.localeCompare(groupNameB);
			}
		);

		// Return object with group data
		return {
			filteredStreams: groupedFilteredStreams,
			allStreams: groupedAllStreams,
			groupNames: sortedGroupNames
		};
	}, [streams, filteredStreams]);

	return (
		<>
			{groupedStreams.groupNames.map(groupName => {
				const filteredGroupStreams =
					groupedStreams.filteredStreams[groupName] || [];
				const allGroupStreams =
					groupedStreams.allStreams[groupName] || [];

				// Only show groups that have streams after filtering or have all streams
				if (
					filteredGroupStreams.length === 0 &&
					allGroupStreams.length === 0
				) {
					return null;
				}

				return (
					<StreamGroupListView
						key={groupName}
						groupName={groupName}
						streams={filteredGroupStreams}
						allStreams={allGroupStreams}
					/>
				);
			})}
		</>
	);
}
