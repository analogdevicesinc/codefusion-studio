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

import type {ReactElement} from 'react';
import {
	AccountIcon,
	Button,
	ConfigIcon,
	DeleteIcon,
	LinkIcon,
	Tooltip
} from 'cfs-react-library';
import Toggle from '@common/components/toggle/Toggle';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import HmcBadge from '../ui-fragments/HmcBadge';
import {useIsRemoteBusy} from '../../state/slices/remotes/remotes.selector';
import {useIndexingLock} from '../../hooks/useIndexingLock';
import type {Remote} from '../../state/slices/remotes/remotes.types';
import styles from './remote-card.module.scss';

export type RemoteCardProps = {
	readonly remote: Remote;
	/** Highlights the card while its authentication is being edited in the side panel. */
	readonly isSelected?: boolean;
	readonly onToggle: (name: string) => void;
	readonly onConfigure: (name: string) => void;
	readonly onDelete: (name: string) => void;
};

/**
 * Displays a single package remote: an enable/disable switch, the remote
 * name, its URL and authentication type, and an inline error when something
 * keeps it from working. Custom remotes additionally get a "Custom" badge
 * plus configure and delete actions; configuring requires the remote to be
 * enabled. Remotes managed by Analog Devices expose no actions.
 */
export default function RemoteCard({
	remote,
	isSelected = false,
	onToggle,
	onConfigure,
	onDelete
}: RemoteCardProps): ReactElement {
	// Locked while a change to this remote is applied, and while indexing
	// holds the package manager
	const isBusy = useIsRemoteBusy(remote.name);
	const indexingLock = useIndexingLock();
	const isLocked = isBusy || indexingLock !== undefined;
	const l10n = useLocaleContext()?.remotes?.card;
	const {name, url, disabled, custom, auth, error} = remote;
	const dataTest = `remote-card:${name}`;
	const toggleLabel = isBusy
		? l10n?.updatingToggle
		: (indexingLock ??
			(disabled ? l10n?.enableToggle : l10n?.disableToggle));

	return (
		<div
			className={`${styles.container} ${
				isSelected ? styles.selected : ''
			}`}
			data-test={dataTest}
		>
			<div
				className={`${styles.toggleColumn} ${isBusy ? styles.busy : ''}`}
			>
				<Tooltip
					title={toggleLabel}
					position='top'
					type={!isBusy && indexingLock ? 'long' : 'short'}
					dataTest={`${dataTest}:toggle`}
				>
					<Toggle
						isToggledOn={!disabled}
						isDisabled={isLocked}
						ariaLabel={toggleLabel}
						dataTest={`${dataTest}:toggle`}
						handleToggle={() => {
							onToggle(name);
						}}
					/>
				</Tooltip>
			</div>
			<div className={styles.content}>
				<div className={styles.header}>
					<div className={styles.nameAndBadge}>
						<span className={styles.name} title={name}>
							{name}
						</span>
						{custom && <HmcBadge>{l10n?.customBadge}</HmcBadge>}
					</div>
					{custom && (
						<div className={styles.actions}>
							<Tooltip
								title={
									disabled
										? l10n?.configureDisabled
										: (indexingLock ?? l10n?.configure)
								}
								position='top'
								type={!disabled && indexingLock ? 'long' : 'short'}
							>
								<Button
									appearance='icon'
									ariaLabel={l10n?.configure}
									// Without its authentication, e.g. right after being
									// enabled, the form couldn't show the current one.
									disabled={disabled || isLocked || !auth}
									dataTest={`${dataTest}:configure`}
									onClick={() => {
										onConfigure(name);
									}}
								>
									<ConfigIcon aria-hidden />
								</Button>
							</Tooltip>
							<Tooltip
								title={indexingLock ?? l10n?.delete}
								position='top'
								type={indexingLock ? 'long' : 'short'}
							>
								<Button
									appearance='icon'
									ariaLabel={l10n?.delete}
									disabled={isLocked}
									dataTest={`${dataTest}:delete`}
									onClick={() => {
										onDelete(name);
									}}
								>
									<DeleteIcon aria-hidden />
								</Button>
							</Tooltip>
						</div>
					)}
				</div>
				<div className={styles.details}>
					<div className={styles.url}>
						<LinkIcon className={styles.icon} aria-hidden />
						<span
							className={styles.urlText}
							title={url}
							data-test={`${dataTest}:url`}
						>
							{url}
						</span>
					</div>
					{/* Not reported for disabled custom remotes. */}
					{auth && (
						<div className={styles.auth}>
							<Tooltip
								title={l10n?.auth?.authenticationMethod}
								position='top'
								type='short'
							>
								<AccountIcon className={styles.icon} aria-hidden />
							</Tooltip>
							<span
								className={styles.authText}
								data-test={`${dataTest}:auth`}
							>
								{l10n?.auth?.[auth]}
							</span>
						</div>
					)}
				</div>
				{error && (
					<p
						className={styles.error}
						// Conan's own wording is too long to show inline.
						title={error.message}
						data-test={`${dataTest}:error`}
					>
						{l10n?.errors?.[error.kind]}
					</p>
				)}
			</div>
		</div>
	);
}
