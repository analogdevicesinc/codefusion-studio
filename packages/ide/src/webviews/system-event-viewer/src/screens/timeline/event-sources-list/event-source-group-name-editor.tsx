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

import {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {
	Button,
	CloseIcon,
	CheckedIcon,
	TextField
} from 'cfs-react-library';

import styles from './event-sources-list.module.scss';

type EventSourceGroupNameEditorProps = Readonly<{
	name: string;
	onSave: (groupName: string) => void;
	onCancel: () => void;
}>;

export default function EventSourceGroupNameEditor({
	name,
	onSave,
	onCancel
}: EventSourceGroupNameEditorProps) {
	const [draftName, setDraftName] = useState(name);
	const textFieldRef = useRef<HTMLInputElement>(null);
	const trimmedDraftName = draftName.trim();
	const canSave = trimmedDraftName.length > 0;

	useLayoutEffect(() => {
		const input = textFieldRef.current;

		input?.focus();
		input?.select();
	}, []);

	const handleSave = useCallback(() => {
		if (!canSave) return;

		onSave(trimmedDraftName);
	}, [canSave, onSave, trimmedDraftName]);

	return (
		<div
			className={styles.groupNameEditor}
			onPointerDown={event => {
				event.stopPropagation();
			}}
			onKeyDown={event => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					onCancel();
				}
			}}
		>
			<TextField
				ref={textFieldRef}
				inputVal={draftName}
				size='small'
				fullWidth
				dataTest='event-sources:group:name-editor'
				onInputChange={setDraftName}
				onKeyDown={event => {
					if (
						event.key === 'Enter' &&
						!event.nativeEvent.isComposing
					) {
						event.preventDefault();
						event.stopPropagation();

						handleSave();
					}
				}}
				endSlot={
					<div className={styles.groupNameEditorActions}>
						<Button
							type='button'
							appearance='primary'
							disabled={!canSave}
							className={styles.groupNameEditorButton}
							ariaLabel='Save Group Name'
							dataTest='event-sources:group:name-editor:save'
							onClick={handleSave}
						>
							<CheckedIcon />
						</Button>
						<Button
							type='button'
							appearance='primary'
							ariaLabel='Cancel Group Name'
							className={styles.groupNameEditorButton}
							dataTest='event-sources:group:name-editor:cancel'
							onClick={onCancel}
						>
							<CloseIcon />
						</Button>
					</div>
				}
			/>
		</div>
	);
}
