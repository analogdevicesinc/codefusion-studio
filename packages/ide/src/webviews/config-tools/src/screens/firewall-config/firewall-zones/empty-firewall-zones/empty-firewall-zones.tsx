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

import {Button, EmptyState} from 'cfs-react-library';
import styles from '../firewall-zones-summary/firewall-zones-summary.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {useAddFirewallZone} from '../../../../hooks/use-firewall-zone-actions';

function EmptyFirewallZones() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones?.['empty-content'];

	const handleAddZone = useAddFirewallZone();

	return (
		<div
			className={styles.noFirewallZones}
			data-test='firewall-zones:empty-firewall-zones'
		>
			<EmptyState title={l10n?.title} description={l10n?.description}>
				<div slot='footer'>
					<Button
						appearance='primary'
						dataTest='empty-firewall-zones:add-zone'
						onClick={handleAddZone}
					>
						{l10n?.addButton}
					</Button>
				</div>
			</EmptyState>
		</div>
	);
}

export default EmptyFirewallZones;
