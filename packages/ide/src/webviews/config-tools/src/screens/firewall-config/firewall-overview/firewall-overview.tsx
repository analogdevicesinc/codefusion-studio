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
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import FirewallOverviewCards from './firewall-overview-cards/firewall-overview-cards';
import {ManageAccessPermissions} from './manage-access-permissions/manage-access-permissions';
import {UnconfiguredFirewalls} from './unconfigured-firewalls/unconfigured-firewalls';
import styles from './firewall-overview.module.scss';

function FirewallOverview() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallOverview;

	return (
		<div
			className={styles.overviewContainer}
			data-test='firewall-overview'
		>
			<div className={styles.overviewHeader}>
				<h1>{l10n?.title}</h1>
				<FirewallOverviewCards />
			</div>
			<ManageAccessPermissions />
			<UnconfiguredFirewalls />
		</div>
	);
}

export default FirewallOverview;
