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

import {useRef} from 'react';
import style from './firewall-zones-summary.module.scss';
import EmptyFirewallZones from '../empty-firewall-zones/empty-firewall-zones';
import FirewallZoneDetails from '../firewall-zone-details/firewall-zone-details';
import ManageFirewallConfig from '../manage-firewall-config/manage-firewall-config';
import {
	useFirewallZones,
	useManageFirewallsView
} from '../../../../state/slices/firewall/firewall.selector';

function FirewallZonesSummary() {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const firewallZones = useFirewallZones();
	const manageFirewallsView = useManageFirewallsView();

	if (manageFirewallsView) {
		return <ManageFirewallConfig />;
	}

	return (
		<div
			ref={scrollContainerRef}
			className={style.container}
			data-test='firewall-zones:summary'
		>
			{firewallZones.length === 0 ? (
				<div className={style.content}>
					<EmptyFirewallZones />
				</div>
			) : (
				<FirewallZoneDetails />
			)}
		</div>
	);
}

export default FirewallZonesSummary;
