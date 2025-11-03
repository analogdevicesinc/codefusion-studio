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

import {CustomizableDropdown, TextField} from 'cfs-react-library';
import {useCallback, useMemo, useState} from 'react';
import {
	useEditingStream,
	useStreams
} from '../../../../state/slices/gaskets/gasket.selector';
import {setEditingStream} from '../../../../state/slices/gaskets/gasket.reducer';
import {useAppDispatch} from '../../../../state/store';
import styles from './stream-groups-select.module.scss';

type StreamGroupSelectorProps = {
	readonly onSelect: (groupName: string) => void;
};

export function StreamGroupSelector({
	onSelect
}: StreamGroupSelectorProps) {
	const dispatch = useAppDispatch();
	const streams = useStreams();
	const editingStream = useEditingStream();
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const [newGroupName, setNewGroupName] = useState<string>('');
	const [error, setError] = useState<string>('');

	// A map from group name to number of streams in that group
	const groupedStreams = useMemo(() => {
		const groupedStreams: Record<string, number> = {};
		streams.forEach(stream => {
			if (stream.Group) {
				groupedStreams[stream.Group] =
					(groupedStreams[stream.Group] || 0) + 1;
			}
		});

		return groupedStreams;
	}, [streams]);

	// Get sorted group names
	const sortedGroups = useMemo(
		() => Object.keys(groupedStreams).sort(),
		[groupedStreams]
	);

	const handleGroupSelect = useCallback(
		(groupName: string) => {
			dispatch(setEditingStream({Group: groupName}));
			setIsExpanded(false);
			onSelect(groupName);
		},
		[dispatch, onSelect]
	);

	const validateGroupName = useCallback((name: string) => {
		const trimmedName = name.trim();

		if (trimmedName.toUpperCase() === 'UNGROUPED') {
			return 'Group name cannot be "UNGROUPED" as it is reserved.';
		}

		return '';
	}, []);

	const handleNewGroupNameChange = useCallback(
		(value: string) => {
			setNewGroupName(value);
			const errorMessage = validateGroupName(value);

			setError(errorMessage);
		},
		[validateGroupName]
	);

	const handleCreateNewGroup = useCallback(() => {
		const trimmedName = newGroupName.trim();
		const errorMessage = validateGroupName(trimmedName);

		if (errorMessage) {
			setError(errorMessage);

			return;
		}

		if (trimmedName) {
			dispatch(setEditingStream({Group: trimmedName}));
			setNewGroupName('');
			setError('');
			setIsExpanded(false);
			onSelect(trimmedName);
		}
	}, [dispatch, newGroupName, onSelect, validateGroupName]);

	const isCreateDisabled = useMemo(
		() => newGroupName.trim().length === 0 || error.length > 0,
		[newGroupName, error]
	);

	return (
		<CustomizableDropdown
			data-test='stream-groups-dropdown'
			value={editingStream?.Group ?? ''}
			isExpanded={isExpanded}
			setIsExpanded={setIsExpanded}
		>
			<div className={styles.dropdownContent}>
				{/* Existing groups */}
				<div className={styles.groupList}>
					{sortedGroups.map(groupName => (
						<div
							key={groupName}
							data-test={`group-item:${groupName}`}
							className={styles.groupItem}
							onClick={() => {
								handleGroupSelect(groupName);
							}}
						>
							{/* name on the left, number of streams on the right */}
							<div data-test={`group-name:${groupName}`}>
								{groupName}
							</div>
							<div
								data-test={`group-count:${groupName}`}
								className={styles.groupCount}
							>
								{groupedStreams[groupName]}
							</div>
						</div>
					))}
				</div>

				{/* Divider */}
				{sortedGroups.length > 0 && (
					<div className={styles.divider} />
				)}

				{/* New group creation */}
				<div className={styles.newGroupSection}>
					<TextField
						dataTest='new-group-name-input'
						inputVal={newGroupName}
						placeholder='New group name'
						error={error}
						onInputChange={handleNewGroupNameChange}
					/>
					<span
						data-test='create-group-action'
						className={
							isCreateDisabled
								? styles.createLinkDisabled
								: styles.createLink
						}
						onClick={handleCreateNewGroup}
					>
						Create Group
					</span>
				</div>
			</div>
		</CustomizableDropdown>
	);
}
