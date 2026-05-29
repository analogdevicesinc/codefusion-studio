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

import {useCallback, useState} from 'react';
import {createPortal} from 'react-dom';
import {
	Button,
	ContextMenu,
	PlusIcon,
	Tooltip
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import sectionStyles from '../security-settings/workspace-security-settings.module.scss';
import {ADD_KEY_OPTIONS} from '../../../constants/workspace-settings';
import type {KeyData} from '../../../types/workspace-settings';
import {
	addSigningKey,
	removeSigningKey
} from '../../../state/slices/app-context/appContext.reducer';
import {useSigningKeys} from '../../../state/slices/app-context/appContext.selector';
import {clearSignKeyReferences} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {useAppDispatch} from '../../../state/store';
import EmptyKey from './empty-key/empty-key';
import ExistingKey from './existing-key/existing-key';
import GenerateKey from './generate-key/generate-key';
import KeyCard from './key-card/key-card';

function SignKeyManagement() {
	const dispatch = useAppDispatch();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['sign-key-management'];

	const [menuOpen, setMenuOpen] = useState(false);
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();
	const [showGenerateKey, setShowGenerateKey] = useState(false);
	const [showExistingKey, setShowExistingKey] = useState(false);
	const keys = useSigningKeys();

	const handleGenerateKey = useCallback(() => {
		setShowExistingKey(false);
		setShowGenerateKey(true);
	}, []);

	const handleCancelGenerateKey = useCallback(() => {
		setShowGenerateKey(false);
	}, []);

	const handleExistingKey = useCallback(() => {
		setShowGenerateKey(false);
		setShowExistingKey(true);
	}, []);

	const handleCancelExistingKey = useCallback(() => {
		setShowExistingKey(false);
	}, []);

	const handleKeySubmit = useCallback(
		(keyData: KeyData) => {
			dispatch(addSigningKey(keyData));
			setShowGenerateKey(false);
			setShowExistingKey(false);
		},
		[dispatch]
	);

	const handleDeleteKey = useCallback(
		(index: number) => {
			const deletedKey = keys[index];
			dispatch(removeSigningKey(index));

			if (deletedKey) {
				dispatch(clearSignKeyReferences(deletedKey.path));
			}
		},
		[dispatch, keys]
	);

	const handleAddKeyClick = useCallback(
		(e: React.MouseEvent<HTMLElement>) => {
			setMenuAnchor(e.currentTarget);
			setMenuOpen(true);
		},
		[]
	);

	const handleMenuClose = useCallback(() => {
		setMenuOpen(false);
	}, []);

	const handleMenuSelect = useCallback(
		(option: {id: string; label: string}) => {
			if (option.id === 'generate-new-key') {
				handleGenerateKey();
			} else if (option.id === 'add-existing-key') {
				handleExistingKey();
			}

			setMenuOpen(false);
		},
		[handleExistingKey, handleGenerateKey]
	);

	const renderContextMenu = () => {
		if (!menuOpen) {
			return null;
		}

		return createPortal(
			<ContextMenu
				anchor={menuAnchor}
				open={menuOpen}
				preferredPlacement='bottom'
				options={ADD_KEY_OPTIONS}
				onClose={handleMenuClose}
				onSelect={handleMenuSelect}
			/>,
			document.body
		);
	};

	return (
		<div
			id='key-management'
			data-test='workspace-setting:sign-key-management'
			className={sectionStyles.sectionContainer}
		>
			<div className={sectionStyles.titleContainer}>
				<div className={sectionStyles.title}>{l10n?.title}</div>
				<Tooltip
					title='Add Key'
					type='long'
					width={50}
					position='bottom'
				>
					<Button
						appearance='icon'
						dataTest='sign-key-management:add-key'
						onClick={handleAddKeyClick}
					>
						<PlusIcon />
					</Button>
				</Tooltip>
				{renderContextMenu()}
			</div>
			{keys.length > 0
				? keys.map((key, index) => (
						<KeyCard
							key={`${key.name}-${key.path}`}
							name={key.name}
							path={key.path}
							algorithm={key.algorithm}
							description={key.description}
							onDelete={() => {
								handleDeleteKey(index);
							}}
						/>
					))
				: !showGenerateKey &&
					!showExistingKey && (
						<EmptyKey
							onGenerateKey={handleGenerateKey}
							onAddExistingKey={handleExistingKey}
						/>
					)}
			{showGenerateKey && (
				<GenerateKey
					existingKeyNames={keys.map(k => k.name)}
					onCancel={handleCancelGenerateKey}
					onSubmit={handleKeySubmit}
				/>
			)}
			{showExistingKey && (
				<ExistingKey
					onCancel={handleCancelExistingKey}
					onSubmit={handleKeySubmit}
				/>
			)}
		</div>
	);
}

export default SignKeyManagement;
