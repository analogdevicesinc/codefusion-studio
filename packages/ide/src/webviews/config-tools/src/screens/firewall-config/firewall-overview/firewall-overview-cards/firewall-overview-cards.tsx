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

import {Card, DropDown, ConflictIcon} from 'cfs-react-library';
import styles from './firewall-overview-cards.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../../../common/constants/navigation';
import {useAppDispatch} from '../../../../state/store';
import {
	setActiveScreen,
	setActiveScreenSubscreen,
	setActiveSettingsChild,
	setActiveSettingsPage
} from '../../../../state/slices/app-context/appContext.reducer';
import {setFirewallStatus} from '../../../../state/slices/firewall/firewall.reducer';
import {
	type FirewallStatusOption,
	type FirewallZoneAccessMode
} from '../../../../types/firewall';
import {
	useFirewallConflictCount,
	useFirewallStatus,
	useFirewallZones
} from '../../../../state/slices/firewall/firewall.selector';
import {
	getConfiguredEntryKeys,
	getConfiguredFirewallCount,
	getUnconfiguredFirewallCount
} from '../../firewall-data';

function FirewallOverviewCards() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallOverview;
	const dispatch = useAppDispatch();
	const firewallStatus = useFirewallStatus();
	const zones = useFirewallZones();
	const conflictCount = useFirewallConflictCount();
	const configuredKeys = getConfiguredEntryKeys(zones);
	const configuredCount = getConfiguredFirewallCount(configuredKeys);
	const unconfiguredCount =
		getUnconfiguredFirewallCount(configuredKeys);

	const countZonesByAccessMode = (
		accessMode: FirewallZoneAccessMode
	) => zones.filter(zone => zone.accessMode === accessMode).length;

	const firewallZones = [
		{
			id: 'openZones',
			label: l10n?.zones?.openZones ?? 'Open zones',
			count: countZonesByAccessMode('open')
		},
		{
			id: 'blockedZones',
			label: l10n?.zones?.blockedZones ?? 'Blocked zones',
			count: countZonesByAccessMode('blocked')
		},
		{
			id: 'restrictedZones',
			label: l10n?.zones?.restrictedZones ?? 'Restricted zones',
			count: countZonesByAccessMode('restricted')
		},
		{
			id: 'conflictsAndErrors',
			label:
				l10n?.zones?.conflictsAndErrors ?? 'Conflicts and errors',
			count: conflictCount,
			isConflict: true
		}
	];

	return (
		<div
			className={styles.cardsContainer}
			data-test='firewall-overview-cards'
		>
			<Card disableHoverEffects>
				<div className={styles.cardContent}>
					<button
						type='button'
						slot='title'
						className={styles.cardTitleLink}
						onClick={() => {
							dispatch(
								setActiveScreenSubscreen(
									navigationItems.firewallZones
								)
							);
						}}
					>
						{l10n?.firewallZones}
					</button>
					{firewallZones.map(zone => (
						<div key={zone.id} className={styles.zoneRow}>
							<span>{zone.label}</span>
							<span className={styles.zoneValue}>
								{zone.isConflict && zone.count > 0 && (
									<ConflictIcon width={16} height={16} />
								)}
								<span
									className={styles.zoneCount}
									data-test={`firewall-overview-cards:${zone.id}-count`}
								>
									{zone.count}
								</span>
							</span>
						</div>
					))}
				</div>
			</Card>
			<Card disableHoverEffects>
				<div className={styles.cardContent}>
					<div slot='title' className={styles.cardTitle}>
						{l10n?.firewallProtectionStatus?.title}
					</div>
					<div className={styles.zoneRow}>
						<span>{l10n?.firewallProtectionStatus?.configured}</span>
						<span
							className={styles.zoneCount}
							data-test='firewall-overview-cards:configured-count'
						>
							{configuredCount}
						</span>
					</div>
					<div className={styles.zoneRow}>
						<span>
							{l10n?.firewallProtectionStatus?.unconfigured}
						</span>
						<span
							className={styles.zoneCount}
							data-test='firewall-overview-cards:unconfigured-count'
						>
							{unconfiguredCount}
						</span>
					</div>
					<button
						type='button'
						className={styles.rowLink}
						onClick={() => {
							dispatch(
								setActiveScreenSubscreen(
									navigationItems.firewallZones
								)
							);
						}}
					>
						{l10n?.firewallProtectionStatus?.link}
					</button>
				</div>
			</Card>
			<Card disableHoverEffects>
				<div className={styles.cardContent}>
					<div slot='title' className={styles.cardTitle}>
						{l10n?.firewallStatus?.title}
					</div>
					<div className={styles.dropdownWrapper}>
						<DropDown
							key={firewallStatus}
							controlId='firewall-status'
							dataTest='firewall-overview-cards:status-dropdown'
							currentControlValue={firewallStatus}
							options={[
								{
									label: l10n?.firewallStatus?.enabled ?? 'Enabled',
									value: 'enabled'
								},
								{
									label:
										l10n?.firewallStatus?.overrideAllBlocked ??
										'Override - All Blocked',
									value: 'overrideAllBlocked'
								},
								{
									label:
										l10n?.firewallStatus?.overrideAllOpen ??
										'Override - All Open',
									value: 'overrideAllOpen'
								}
							]}
							onHandleDropdown={value => {
								dispatch(
									setFirewallStatus(value as FirewallStatusOption)
								);
							}}
						/>
					</div>
					<button
						type='button'
						className={styles.rowLink}
						onClick={() => {
							dispatch(setActiveScreen(navigationItems.settings));
							dispatch(setActiveSettingsPage('security'));
							dispatch(setActiveSettingsChild('firewall-status'));
						}}
					>
						{l10n?.firewallStatus?.securitySettings}
					</button>
				</div>
			</Card>
		</div>
	);
}

export default FirewallOverviewCards;
