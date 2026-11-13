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
import {useEffect, useRef, useState} from 'react';
import {
	Button,
	CloseIcon,
	CustomizableDropdown,
	PlusIcon,
	TextField,
	Tooltip
} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {localizeWithArgs} from '@common/utils/string';
import {
	validateGroupName,
	type GroupNameError
} from '../utils/group-filter';
import styles from './ProjectGroups.module.scss';

type ProjectGroupsProps = Readonly<{
	/** Groups the project belongs to, in manifest order. */
	groups: string[];
	/** Every group the manifest knows about, offered in the dropdown. */
	availableGroups: string[];
	/** Position of the project in the manifest, used for the test hooks. */
	index: number;
	onChange: (groups: string[]) => void;
}>;

type Mode = 'pills' | 'select' | 'create';

/**
 * The groups of one project: a pill per group, and a `+` button that opens
 * a dropdown to add a known group or create a new one.
 */
export default function ProjectGroups({
	groups,
	availableGroups,
	index,
	onChange
}: ProjectGroupsProps) {
	const l10n = useLocaleContext();
	const [mode, setMode] = useState<Mode>('pills');
	const [draft, setDraft] = useState('');
	const [error, setError] = useState<GroupNameError>();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (mode === 'create') inputRef.current?.focus();
	}, [mode]);

	const closeCreate = () => {
		setDraft('');
		setError(undefined);
		setMode('pills');
	};

	const confirmCreate = () => {
		const name = draft.trim();
		const reason = validateGroupName(name);

		if (reason) {
			setError(reason);

			return;
		}

		if (!groups.includes(name)) onChange([...groups, name]);

		closeCreate();
	};

	if (mode === 'create') {
		return (
			<div className={styles.field}>
				<TextField
					ref={inputRef}
					fullWidth
					size='small'
					inputVal={draft}
					error={error && l10n?.projects.groupNameError[error]}
					dataTest={`west-editor:project-group-input-${index}`}
					endSlot={
						<div className={styles.actions}>
							<Button
								appearance='icon'
								className={styles.actionButton}
								ariaLabel={l10n?.projects.confirmGroup}
								dataTest={`west-editor:project-group-confirm-${index}`}
								onClick={confirmCreate}
							>
								<span className='codicon codicon-check' aria-hidden />
							</Button>
							<Button
								appearance='icon'
								className={styles.actionButton}
								ariaLabel={l10n?.projects.cancelGroup}
								dataTest={`west-editor:project-group-cancel-${index}`}
								onClick={closeCreate}
							>
								<CloseIcon />
							</Button>
						</div>
					}
					onInputChange={value => {
						setDraft(value);
						setError(undefined);
					}}
					onKeyDown={event => {
						if (event.key === 'Enter') confirmCreate();
						if (event.key === 'Escape') closeCreate();
					}}
				/>
			</div>
		);
	}

	if (mode === 'select') {
		return (
			<div className={styles.field}>
				<CustomizableDropdown
					isExpanded
					value={l10n?.projects.selectGroup}
					dataTest={`west-editor:project-group-dropdown-${index}`}
					setIsExpanded={expanded => {
						if (!expanded) setMode('pills');
					}}
				>
					<div className={styles.menu}>
						{availableGroups
							.filter(group => !groups.includes(group))
							.map(group => (
								<button
									key={group}
									type='button'
									className={styles.option}
									data-test={`west-editor:project-group-option-${index}-${group}`}
									onClick={() => {
										onChange([...groups, group]);
										setMode('pills');
									}}
								>
									{group}
								</button>
							))}
						<button
							type='button'
							className={styles.create}
							data-test={`west-editor:project-group-create-${index}`}
							onClick={() => {
								setMode('create');
							}}
						>
							{l10n?.projects.createGroup}
						</button>
					</div>
				</CustomizableDropdown>
			</div>
		);
	}

	return (
		<div className={styles.pills}>
			{groups.map(group => (
				<span
					key={group}
					className={styles.pill}
					data-test={`west-editor:project-group-${index}-${group}`}
				>
					{group}
					<Button
						appearance='icon'
						className={styles.pillRemove}
						ariaLabel={localizeWithArgs(
							l10n,
							'projects.removeGroup',
							{
								group
							}
						)}
						dataTest={`west-editor:project-group-remove-${index}-${group}`}
						onClick={() => {
							onChange(groups.filter(g => g !== group));
						}}
					>
						<CloseIcon />
					</Button>
				</span>
			))}
			<Tooltip type='short' title={l10n?.projects.addGroup}>
				<Button
					appearance='icon'
					ariaLabel={l10n?.projects.addGroup}
					dataTest={`west-editor:project-group-add-${index}`}
					onClick={() => {
						setMode('select');
					}}
				>
					<PlusIcon />
				</Button>
			</Tooltip>
		</div>
	);
}
