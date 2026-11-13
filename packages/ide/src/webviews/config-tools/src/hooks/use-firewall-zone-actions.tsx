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
import {useCallback} from 'react';
import {addFirewallZone} from '../state/slices/firewall/firewall.reducer';
import {type FirewallZone} from '../types/firewall';
import {useFirewallZones} from '../state/slices/firewall/firewall.selector';
import {useAppDispatch} from '../state/store';
import {
	DEFAULT_FIREWALL_ZONE_ACCESS_MODE,
	DEFAULT_FIREWALL_ZONE_ACCESS_MODES
} from '../screens/firewall-config/firewall-zones/constants';

export function useAddFirewallZone() {
	const dispatch = useAppDispatch();
	const firewallZones = useFirewallZones();

	const handleAddZone = useCallback(() => {
		const existingNames = new Set(
			firewallZones.map(zone => zone.name)
		);

		let counter = 1;

		while (existingNames.has(`New Zone ${String(counter)}`)) {
			counter++;
		}

		const newZone: FirewallZone = {
			id: crypto.randomUUID(),
			name: `New Zone ${String(counter)}`,
			description: '',
			accessMode: DEFAULT_FIREWALL_ZONE_ACCESS_MODE,
			accessModes: {...DEFAULT_FIREWALL_ZONE_ACCESS_MODES}
		};

		dispatch(addFirewallZone(newZone));
	}, [dispatch, firewallZones]);

	return handleAddZone;
}
