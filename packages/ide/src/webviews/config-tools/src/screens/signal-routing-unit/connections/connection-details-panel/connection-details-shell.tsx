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

import {type ReactNode} from 'react';
import {Button, SlidingPanel} from 'cfs-react-library';
import {useAppDispatch} from '../../../../state/store';
import {clearEditableConnections} from '../../../../state/slices/sru/sru.reducer';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './connection-details-panel.module.scss';

export const USER_DESCRIPTION_MAX_LENGTH = 500;

type ConnectionDetailsShellProps = {
	readonly isDirty: boolean;
	readonly children: ReactNode;
	readonly onSave: () => void;
	readonly onBeforeSave?: () => boolean;
};

/**
 * Chrome shared by the input and output variants of the connection details
 * panel: the sliding panel itself and its Save footer.
 *
 * Saving commits the staged edits and then closes the panel.
 */
export function ConnectionDetailsShell({
	isDirty,
	children,
	onSave,
	onBeforeSave
}: ConnectionDetailsShellProps) {
	const dispatch = useAppDispatch();
	const detailsL10n = useConnectionDetailsL10n();

	return (
		<SlidingPanel
			title={detailsL10n?.title}
			isMinimised={false}
			dataTest='signal-routing-unit-connection-details'
			closeDataTest='connection-details-close'
			closeSlider={() => {
				dispatch(clearEditableConnections());
			}}
			footer={
				<div className={styles.footer}>
					<Button
						appearance='primary'
						disabled={!isDirty}
						dataTest='connection-details-save'
						onClick={() => {
							if (onBeforeSave && !onBeforeSave()) {
								return;
							}

							onSave();
							dispatch(clearEditableConnections());
						}}
					>
						{detailsL10n?.save}
					</Button>
				</div>
			}
		>
			<div className={styles.container}>{children}</div>
		</SlidingPanel>
	);
}

type DetailsFieldProps = {
	readonly label: string;
	readonly children: ReactNode;
};

/** A labeled control within a connection details section. */
export function DetailsField({label, children}: DetailsFieldProps) {
	return (
		<div className={styles.field}>
			<label className={styles.fieldLabel}>{label}</label>
			{children}
		</div>
	);
}

type SignalSummaryProps = {
	readonly signalName?: string;
	readonly description?: string;
	readonly peripheralName?: string;
	readonly signalType?: string;
	readonly children?: ReactNode;
};

/**
 * Read-only summary of a single SRU signal: its raw hardware name (never
 * the user-assigned alias, which is edited separately), owning peripheral,
 * signal type and SoC-provided description (shown as the "Signal Info" row).
 * `children`, when given, renders after the detail rows - used by the
 * connection details panels to place the Alias field there.
 */
export function SignalSummary({
	signalName,
	description,
	peripheralName,
	signalType,
	children
}: SignalSummaryProps) {
	const detailsL10n = useConnectionDetailsL10n();

	return (
		<div className={styles.summary}>
			{signalName && (
				<h4
					className={styles.signalName}
					data-test='connection-details-signal-name'
				>
					{signalName}
				</h4>
			)}
			<div className={styles.rowsGroup}>
				<div className={styles.row}>
					<span className={styles.rowLabel}>
						{detailsL10n?.peripheral ?? 'Peripheral'}
					</span>
					<span className={styles.rowValue}>
						{peripheralName ?? '-'}
					</span>
				</div>
				<div className={styles.row}>
					<span className={styles.rowLabel}>
						{detailsL10n?.type ?? 'Type'}
					</span>
					<span className={styles.rowValue}>{signalType ?? '-'}</span>
				</div>
				<div className={styles.row}>
					<span className={styles.rowLabel}>
						{detailsL10n?.signalInfo ?? 'Signal Info'}
					</span>
					<span className={styles.rowValue}>
						{description ?? '-'}
					</span>
				</div>
			</div>
			{children}
		</div>
	);
}
