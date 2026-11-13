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

import {Button, Tooltip} from 'cfs-react-library';
import styles from './remotes-header.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';

export type RemotesHeaderProps = {
	readonly onAddRemote?: () => void;
	/** Disables adding a remote, e.g. while custom remotes are indexed. */
	readonly isAddDisabled?: boolean;
	/** Shown as a tooltip while adding is disabled. */
	readonly addDisabledReason?: string;
};

/**
 * Displays the "Manage your remotes" title, subtitle, and the
 * primary action to add a new remote source.
 */
export default function RemotesHeader({
	onAddRemote,
	isAddDisabled = false,
	addDisabledReason
}: RemotesHeaderProps) {
	const l10n = useLocaleContext()?.remotes;
	const addButton = (
		<Button
			appearance='primary'
			className={styles.addButton}
			dataTest='remotes:add'
			disabled={isAddDisabled}
			onClick={onAddRemote}
		>
			{l10n?.addRemoteButton}
		</Button>
	);

	return (
		<div className={styles.container}>
			<div className={styles.titleContainer}>
				<h1 className={styles.heading}>{l10n?.title}</h1>
				<span className={styles.subtitle}>{l10n?.subtitle}</span>
			</div>
			{isAddDisabled && addDisabledReason ? (
				<Tooltip
					title={addDisabledReason}
					position='bottom'
					type='long'
					dataTest='remotes:add-tooltip'
				>
					{addButton}
				</Tooltip>
			) : (
				addButton
			)}
		</div>
	);
}
