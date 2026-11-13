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

import {
	Button,
	DropDown,
	LockIcon,
	SlidingPanel,
	TextField,
	Tooltip
} from 'cfs-react-library';
import {useState, type KeyboardEvent} from 'react';
// Imported from dist/ directly, as the package entry point pulls in Node.js modules
import {validateRemoteUrl} from 'cfs-package-manager/dist/utils/remote-url.js';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {
	CustomRemoteAuthType,
	Remote,
	RemoteFormValues
} from '../../state/slices/remotes/remotes.types';
import styles from './remote-sidebar.module.scss';

/** Props of {@link RemoteSidebar}. */
export type RemoteSidebarProps = {
	readonly isOpen: boolean;
	readonly mode: 'add' | 'edit';
	/** The custom remote being edited. Required when `mode` is 'edit'. */
	readonly remote?: Remote;
	/** The existing remotes, whose names a new remote can't reuse. */
	readonly remotes: readonly Remote[];
	/**
	 * Locks the form while a remote change is being applied. It can still be
	 * closed, which leaves the change running.
	 */
	readonly isLocked?: boolean;
	readonly onClose: () => void;
	readonly onSubmit: (values: RemoteFormValues) => void;
};

type FormState = {
	name: string;
	url: string;
	auth: CustomRemoteAuthType;
	username: string;
	password: string;
};

/** Localization keys of the messages shown under invalid fields. */
type FormErrors = {
	name?: 'nameRequired' | 'nameInvalid' | 'nameExists';
	url?: 'urlRequired' | 'urlInvalid';
};

const DATA_TEST = 'remote-sidebar';

/**
 * Checks the name of a new remote against the rules of the package manager,
 * which stores names in lower case.
 */
function validateName(
	name: string,
	remotes: readonly Remote[]
): FormErrors['name'] {
	const normalized = name.trim().toLowerCase();

	if (!normalized) {
		return 'nameRequired';
	}

	if (!/^[\w-]+$/.test(normalized)) {
		return 'nameInvalid';
	}

	if (remotes.some(r => r.name.toLowerCase() === normalized)) {
		return 'nameExists';
	}

	return undefined;
}

function validateUrl(url: string): FormErrors['url'] {
	const validation = validateRemoteUrl(url);

	if (validation.valid) {
		return undefined;
	}

	return validation.error === 'required'
		? 'urlRequired'
		: 'urlInvalid';
}

function getInitialFormState(
	mode: RemoteSidebarProps['mode'],
	remote: Remote | undefined
): FormState {
	if (mode === 'edit' && remote) {
		return {
			name: remote.name,
			url: remote.url,
			auth:
				remote.auth === 'usernamePassword'
					? 'usernamePassword'
					: 'none',
			username: remote.username ?? '',
			password: ''
		};
	}

	return {
		name: '',
		url: '',
		auth: 'none',
		username: '',
		password: ''
	};
}

/**
 * Sliding panel with the form used to add a new custom remote or to edit the
 * authentication of an existing one. The name and URL of a remote are
 * read-only once it has been created.
 *
 * Keep it mounted and toggle `isOpen` so the slide animation plays. The form
 * resets whenever the panel opens, or when `mode` or the edited remote change
 * while it is open.
 */
export default function RemoteSidebar({
	isOpen,
	mode,
	remote,
	remotes,
	isLocked = false,
	onClose,
	onSubmit
}: RemoteSidebarProps) {
	const l10n = useLocaleContext()?.remotes?.sidebar;
	const isEdit = mode === 'edit';

	const [form, setForm] = useState<FormState>(() =>
		getInitialFormState(mode, remote)
	);

	const [errors, setErrors] = useState<FormErrors>({});

	// Reset the form while rendering (rather than in an effect) so the
	// previous values never flash when the panel opens.
	const formKey = isOpen
		? `${mode}:${remote?.name ?? ''}`
		: undefined;
	const [appliedFormKey, setAppliedFormKey] = useState<
		string | undefined
	>(formKey);

	if (formKey !== appliedFormKey) {
		setAppliedFormKey(formKey);

		if (formKey === undefined) {
			// Drop the password as soon as the panel closes. The other fields
			// stay so the content doesn't change during the slide-out animation.
			setForm(prev => ({...prev, password: ''}));
		} else {
			setForm(getInitialFormState(mode, remote));
			setErrors({});
		}
	}

	// Editing a remote that already has credentials: an empty password
	// keeps the stored one, but only for the same username.
	const canKeepPassword =
		isEdit &&
		remote?.auth === 'usernamePassword' &&
		form.auth === 'usernamePassword' &&
		form.username.trim() === remote.username;

	const hasErrors =
		errors.name !== undefined || errors.url !== undefined;

	const updateField = (field: keyof FormState, value: string) => {
		setForm(prev => ({...prev, [field]: value}));

		// The name and URL of a new remote are checked as they are typed.
		if (!isEdit && field === 'name') {
			setErrors(prev => ({
				...prev,
				name: validateName(value, remotes)
			}));
		} else if (!isEdit && field === 'url') {
			setErrors(prev => ({...prev, url: validateUrl(value)}));
		}
	};

	const handleAuthChange = (value: string) => {
		const auth: CustomRemoteAuthType =
			value === 'usernamePassword' ? 'usernamePassword' : 'none';

		setForm(prev => ({...prev, auth}));
	};

	const handleSubmit = () => {
		if (isLocked) {
			return;
		}

		const name = form.name.trim();
		const url = form.url.trim();

		if (!isEdit) {
			// Also catches the fields that were never typed into.
			const newErrors: FormErrors = {
				name: validateName(name, remotes),
				url: validateUrl(url)
			};

			if (newErrors.name || newErrors.url) {
				setErrors(newErrors);

				return;
			}
		}

		if (form.auth === 'none') {
			onSubmit({name, url, auth: 'none'});

			return;
		}

		onSubmit({
			name,
			url,
			auth: 'usernamePassword',
			username: form.username.trim(),
			// Omitted when empty so the current password is kept.
			...(form.password ? {password: form.password} : {})
		});
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	};

	const readOnlyIndicator = isEdit ? (
		<Tooltip title={l10n?.readOnly ?? ''} position='top'>
			<LockIcon
				className={styles.lockIcon}
				fill='currentColor'
				aria-label={l10n?.readOnly}
				role='img'
			/>
		</Tooltip>
	) : undefined;

	return (
		<SlidingPanel
			title={isEdit ? l10n?.editTitle : l10n?.addTitle}
			isCloseable
			isMinimised={!isOpen}
			dataTest={DATA_TEST}
			closeDataTest={`${DATA_TEST}:close`}
			closeSlider={onClose}
			footer={
				<div className={styles.footer}>
					<Button
						appearance='primary'
						className={styles.submitButton}
						disabled={isLocked || hasErrors}
						dataTest={`${DATA_TEST}:submit`}
						onClick={handleSubmit}
					>
						{isEdit ? l10n?.saveButton : l10n?.addButton}
					</Button>
				</div>
			}
		>
			<section className={styles.section}>
				<h3 className={styles.heading}>{l10n?.remoteDetails}</h3>
				<div className={styles.field}>
					<div className={styles.label}>{l10n?.nameLabel}</div>
					<TextField
						inputVal={form.name}
						placeholder={l10n?.namePlaceholder}
						readOnly={isEdit}
						isDisabled={isLocked}
						error={errors.name && l10n?.errors?.[errors.name]}
						endSlot={readOnlyIndicator}
						dataTest={`${DATA_TEST}:name`}
						onInputChange={value => {
							updateField('name', value);
						}}
						onKeyDown={handleKeyDown}
					/>
				</div>
				<div className={styles.field}>
					<div className={styles.label}>{l10n?.urlLabel}</div>
					<TextField
						inputVal={form.url}
						placeholder={l10n?.urlPlaceholder}
						readOnly={isEdit}
						isDisabled={isLocked}
						error={errors.url && l10n?.errors?.[errors.url]}
						endSlot={readOnlyIndicator}
						dataTest={`${DATA_TEST}:url`}
						onInputChange={value => {
							updateField('url', value);
						}}
						onKeyDown={handleKeyDown}
					/>
				</div>
			</section>
			<section className={`${styles.section} ${styles.authSection}`}>
				<h3 className={styles.heading}>{l10n?.authentication}</h3>
				<div className={styles.field}>
					<div className={styles.label}>{l10n?.authLabel}</div>
					<DropDown
						controlId={`${DATA_TEST}-auth`}
						dataTest={`${DATA_TEST}:auth`}
						isDisabled={isLocked}
						currentControlValue={form.auth}
						options={[
							{
								value: 'none',
								label: l10n?.authOptions?.none,
								dataTest: `${DATA_TEST}:auth:none`
							},
							{
								value: 'usernamePassword',
								label: l10n?.authOptions?.usernamePassword,
								dataTest: `${DATA_TEST}:auth:usernamePassword`
							}
						]}
						onHandleDropdown={handleAuthChange}
					/>
				</div>
				{form.auth === 'usernamePassword' && (
					<>
						<div className={styles.field}>
							<div className={styles.label}>
								{l10n?.usernameLabel}
							</div>
							<TextField
								inputVal={form.username}
								placeholder={l10n?.usernamePlaceholder}
								isDisabled={isLocked}
								dataTest={`${DATA_TEST}:username`}
								onInputChange={value => {
									updateField('username', value);
								}}
								onKeyDown={handleKeyDown}
							/>
						</div>
						<div className={styles.field}>
							<div className={styles.label}>
								{l10n?.passwordLabel}
							</div>
							<TextField
								type='password'
								inputVal={form.password}
								placeholder={
									canKeepPassword
										? l10n?.passwordKeepPlaceholder
										: l10n?.passwordPlaceholder
								}
								isDisabled={isLocked}
								dataTest={`${DATA_TEST}:password`}
								onInputChange={value => {
									updateField('password', value);
								}}
								onKeyDown={handleKeyDown}
							/>
						</div>
					</>
				)}
			</section>
		</SlidingPanel>
	);
}
