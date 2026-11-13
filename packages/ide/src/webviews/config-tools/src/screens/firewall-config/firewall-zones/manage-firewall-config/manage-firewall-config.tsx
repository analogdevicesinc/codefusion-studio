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

import {useState} from 'react';
import {Button, Chip, SearchInput} from 'cfs-react-library';
import CfsFooter from '@common/components/cfs-footer/CfsFooter';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {
	setManageFirewallsView,
	updateFirewallZone
} from '../../../../state/slices/firewall/firewall.reducer';
import {
	useActiveFirewallZone,
	useManageFirewallsColumn
} from '../../../../state/slices/firewall/firewall.selector';
import {useAppDispatch} from '../../../../state/store';
import ManageInitiatorResponderTable from './manage-initiator-responder-table/manage-initiator-responder-table';
import styles from './manage-firewall-config.module.scss';

function ManageFirewallConfig() {
	const dispatch = useAppDispatch();
	const activeZone = useActiveFirewallZone();
	const initialColumn = useManageFirewallsColumn();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones?.['manage-firewalls'];

	const [searchQuery, setSearchQuery] = useState('');
	const [showUnconfigured, setShowUnconfigured] = useState(false);
	const [showConfigured, setShowConfigured] = useState(false);
	const [selectedEntries, setSelectedEntries] = useState<string[]>(
		() => activeZone?.selectedFirewalls ?? []
	);

	const handleBackClick = () => {
		dispatch(setManageFirewallsView(false));
	};

	const handleEntriesChange = (keys: string[], selected: boolean) => {
		setSelectedEntries(prev =>
			selected
				? Array.from(new Set([...prev, ...keys]))
				: prev.filter(key => !keys.includes(key))
		);
	};

	const handleApply = () => {
		if (activeZone) {
			dispatch(
				updateFirewallZone({
					id: activeZone.id,
					updates: {selectedFirewalls: selectedEntries}
				})
			);
		}

		handleBackClick();
	};

	const savedEntries = activeZone?.selectedFirewalls ?? [];
	const hasChanges =
		savedEntries.length !== selectedEntries.length ||
		savedEntries.some(entry => !selectedEntries.includes(entry));

	return (
		<div
			className={styles.container}
			data-test='firewall-zones:manage-firewall-view'
		>
			<div className={styles.manageFirewallContainer}>
				<div className={styles.header}>
					<div
						className={styles.breadcrumb}
						data-test='firewall-zones:manage-firewall-view:breadcrumb'
					>
						<span
							className={styles.breadcrumbLink}
							role='button'
							tabIndex={0}
							data-test='firewall-zones:manage-firewall-view:back'
							onClick={handleBackClick}
							onKeyDown={event => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									handleBackClick();
								}
							}}
						>
							{activeZone?.name}
						</span>
						<span className={styles.breadcrumbCurrent}>
							{` / ${l10n?.breadcrumb ?? 'Manage Firewalls'}`}
						</span>
					</div>
					<div
						className={styles.titleContainer}
						data-test='firewall-zones:manage-firewall-view:content'
					>
						<div className={styles.title}>
							{l10n?.title ?? 'Manage Firewalls'}
						</div>
						<div className={styles.description}>
							{l10n?.description ?? ''}
						</div>
					</div>
				</div>
				<div className={styles.searchContainer}>
					<div className={styles.searchWrapper}>
						<SearchInput
							inputVal={searchQuery}
							placeholder={
								l10n?.searchPlaceholder ??
								'Search Initiators and Responders'
							}
							dataTest='firewall-zones:manage-firewall-view:search'
							onInputChange={setSearchQuery}
							onClear={() => {
								setSearchQuery('');
							}}
						/>
					</div>
					<div className={styles.searchFilter}>
						<Chip
							label={l10n?.unconfigured ?? 'Unconfigured'}
							isActive={showUnconfigured}
							isDisabled={false}
							dataTest='firewall-zones:manage-firewall-view:filter-unconfigured'
							onClick={() => {
								setShowUnconfigured(prev => !prev);
							}}
						/>
						<Chip
							label={l10n?.configured ?? 'Configured'}
							isActive={showConfigured}
							isDisabled={false}
							dataTest='firewall-zones:manage-firewall-view:filter-configured'
							onClick={() => {
								setShowConfigured(prev => !prev);
							}}
						/>
					</div>
				</div>
				<ManageInitiatorResponderTable
					initialColumn={initialColumn}
					searchQuery={searchQuery}
					isUnconfiguredActive={showUnconfigured}
					isConfiguredActive={showConfigured}
					selectedEntries={selectedEntries}
					onEntriesChange={handleEntriesChange}
				/>
			</div>
			<CfsFooter>
				<div
					className={styles.footer}
					data-test='firewall-zones:manage-firewall-view:footer'
				>
					<Button
						type='button'
						appearance='secondary'
						dataTest='firewall-zones:manage-firewall-view:cancel-btn'
						onClick={handleBackClick}
					>
						{l10n?.cancelButton ?? 'Cancel'}
					</Button>
					<Button
						type='button'
						disabled={!hasChanges}
						dataTest='firewall-zones:manage-firewall-view:apply-btn'
						onClick={handleApply}
					>
						{l10n?.applyButton ?? 'Apply'}
					</Button>
				</div>
			</CfsFooter>
		</div>
	);
}

export default ManageFirewallConfig;
