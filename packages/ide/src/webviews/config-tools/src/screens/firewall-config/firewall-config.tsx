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

import {useEffect} from 'react';
import {Button, WarningIcon} from 'cfs-react-library';
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsTwoColumnLayout';
import {navigationItems} from '../../../../common/constants/navigation';
import type {NavigationItem} from '../../../../common/types/navigation';
import {useAppDispatch} from '../../state/store';
import {
	setActiveScreenSubscreen,
	setActiveScreenSubscreens
} from '../../state/slices/app-context/appContext.reducer';
import {useActiveScreenSubscreen} from '../../state/slices/app-context/appContext.selector';
import {
	setActiveResponderConfig,
	setFirewallStatus,
	setManageFirewallsView
} from '../../state/slices/firewall/firewall.reducer';
import {
	useActiveZoneId,
	useFirewallStatus,
	useManageFirewallsView
} from '../../state/slices/firewall/firewall.selector';
import styles from './firewall-config.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import FirewallOverview from './firewall-overview/firewall-overview';
import FirewallConfigSidebar from './firewall-zones/firewall-config-sidebar/firewall-config-sidebar';
import FirewallZonesSidebar from './firewall-zones/firewall-zones-sidebar/firewall-zones-sidebar';
import FirewallZonesSummary from './firewall-zones/firewall-zones-summary/firewall-zones-summary';

export function FirewallConfig({
	initialActiveScreenSubscreen
}: {
	readonly initialActiveScreenSubscreen?: NavigationItem;
}) {
	const dispatch = useAppDispatch();
	const activeScreenSubscreen = useActiveScreenSubscreen();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallOverview;
	const firewallStatus = useFirewallStatus();
	const manageFirewallsView = useManageFirewallsView();
	const activeZoneId = useActiveZoneId();

	const showWarningBanner =
		firewallStatus === 'overrideAllBlocked' ||
		firewallStatus === 'overrideAllOpen';

	const bannerMessage =
		firewallStatus === 'overrideAllOpen'
			? l10n?.firewallStatus?.overrideBannerOpen
			: l10n?.firewallStatus?.overrideBanner;

	useEffect(() => {
		dispatch(
			setActiveScreenSubscreens([
				navigationItems.firewallOverview,
				navigationItems.firewallZones
			])
		);
		dispatch(
			setActiveScreenSubscreen(
				initialActiveScreenSubscreen ??
					navigationItems.firewallOverview
			)
		);
	}, [dispatch, initialActiveScreenSubscreen]);

	useEffect(() => {
		if (activeScreenSubscreen !== navigationItems.firewallZones) {
			dispatch(setManageFirewallsView(false));
			dispatch(setActiveResponderConfig(undefined));
		}
	}, [dispatch, activeScreenSubscreen]);

	useEffect(() => {
		if (manageFirewallsView) {
			dispatch(setActiveResponderConfig(undefined));
		}
	}, [dispatch, manageFirewallsView]);

	useEffect(() => {
		dispatch(setActiveResponderConfig(undefined));
	}, [dispatch, activeZoneId]);

	const handleEnableFirewall = () => {
		dispatch(setFirewallStatus('enabled'));
	};

	const isFirewallZones =
		activeScreenSubscreen === navigationItems.firewallZones;

	const showSidebar = isFirewallZones && !manageFirewallsView;

	return (
		<div
			className={`${styles.firewallConfigContainer} ${
				showWarningBanner ? styles.withBanner : ''
			} ${showSidebar ? styles.withSidebar : ''}`}
			data-test='firewall-config:container'
		>
			<CfsTwoColumnLayout>
				{showWarningBanner && (
					<div
						className={styles.header}
						slot='header'
						data-test='firewall-overview:banner'
					>
						<WarningIcon />
						<span className={styles.bannerMessage}>
							{bannerMessage}
						</span>
						<Button
							appearance='secondary'
							dataTest='firewall-overview:banner-enable-button'
							onClick={handleEnableFirewall}
						>
							{l10n?.firewallStatus?.enableFirewall}
						</Button>
					</div>
				)}
				{showSidebar && (
					<div slot='side-panel'>
						<FirewallZonesSidebar />
					</div>
				)}
				{isFirewallZones ? (
					<FirewallZonesSummary />
				) : (
					<FirewallOverview />
				)}
				{isFirewallZones && <FirewallConfigSidebar />}
			</CfsTwoColumnLayout>
		</div>
	);
}
