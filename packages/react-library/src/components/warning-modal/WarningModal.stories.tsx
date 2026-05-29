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

import type {Meta} from '@storybook/react';
import {fn} from '@storybook/test';
import {useState} from 'react';
import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';
import WarningModal from './WarningModal';

const meta: Meta<typeof WarningModal> = {
	component: WarningModal,
	title: 'Warning Modal'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof WarningModal>
) {
	const [isOpen, setIsOpen] = useState(false);

	const openModal = (): void => {
		setIsOpen(true);
	};

	const closeModal = (): void => {
		setIsOpen(false);
	};

	const handleConfirm = (isDismissed: boolean): void => {
		args.onConfirm(isDismissed);
		closeModal();
	};

	const handleCancel = (): void => {
		args.onCancel();
		closeModal();
	};

	return (
		<>
			<WarningModal
				{...args}
				isOpen={isOpen}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<VSCodeButton onClick={openModal}>
				Open Warning Modal
			</VSCodeButton>
		</>
	);
}

Default.args = {
	title: 'Confirm Delete Action',
	description:
		'Are you sure you want to delete this item? This action cannot be undone.',
	dismissLabel: "Don't show this again",
	cancelLabel: 'Cancel',
	confirmLabel: 'Delete',
	dataTest: 'warning-modal',
	onConfirm: fn(),
	onCancel: fn()
};

export function WithoutDescription(
	args: React.ComponentProps<typeof WarningModal>
) {
	const [isOpen, setIsOpen] = useState(false);

	const openModal = (): void => {
		setIsOpen(true);
	};

	const closeModal = (): void => {
		setIsOpen(false);
	};

	const handleConfirm = (isDismissed: boolean): void => {
		args.onConfirm(isDismissed);
		closeModal();
	};

	const handleCancel = (): void => {
		args.onCancel();
		closeModal();
	};

	return (
		<>
			<WarningModal
				{...args}
				isOpen={isOpen}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<VSCodeButton onClick={openModal}>
				Open Warning Modal
			</VSCodeButton>
		</>
	);
}

WithoutDescription.args = {
	title: 'Confirm Action',
	dismissLabel: "Don't show this again",
	cancelLabel: 'Cancel',
	confirmLabel: 'Confirm',
	dataTest: 'warning-modal-no-desc',
	onConfirm: fn(),
	onCancel: fn()
};

export function CustomLabels(
	args: React.ComponentProps<typeof WarningModal>
) {
	const [isOpen, setIsOpen] = useState(false);

	const openModal = (): void => {
		setIsOpen(true);
	};

	const closeModal = (): void => {
		setIsOpen(false);
	};

	const handleConfirm = (isDismissed: boolean): void => {
		args.onConfirm(isDismissed);
		closeModal();
	};

	const handleCancel = (): void => {
		args.onCancel();
		closeModal();
	};

	return (
		<>
			<WarningModal
				{...args}
				isOpen={isOpen}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<VSCodeButton onClick={openModal}>
				Open Warning Modal
			</VSCodeButton>
		</>
	);
}

CustomLabels.args = {
	title: 'Unsaved Changes',
	description:
		'You have unsaved changes. Do you want to discard them?',
	dismissLabel: 'Always discard without asking',
	cancelLabel: 'Keep Editing',
	confirmLabel: 'Discard Changes',
	dataTest: 'warning-modal-custom',
	onConfirm: fn(),
	onCancel: fn()
};
