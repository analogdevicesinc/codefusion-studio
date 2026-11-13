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
	Badge,
	Card,
	CheckBox,
	InfoIcon,
	Tooltip
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {type FirewallZoneAccessModeId} from '../../../../types/firewall';
import {useActiveFirewallZone} from '../../../../state/slices/firewall/firewall.selector';
import {updateFirewallZone} from '../../../../state/slices/firewall/firewall.reducer';
import {useAppDispatch} from '../../../../state/store';
import {
	DEFAULT_FIREWALL_ZONE_ACCESS_MODES,
	FIREWALL_ZONE_ACCESS_MODE_BADGE_APPEARANCE,
	FIREWALL_ZONE_ACCESS_MODE_IDS,
	FIREWALL_ZONE_ACCESS_MODE_LABELS,
	getFirewallZoneAccessMode
} from '../constants';
import styles from './manage-access-modes.module.scss';

function ManageAccessModes() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones?.['manage-access-modes'];

	const dispatch = useAppDispatch();
	const activeZone = useActiveFirewallZone();

	const selectedModes: Record<FirewallZoneAccessModeId, boolean> =
		activeZone?.accessModes ?? DEFAULT_FIREWALL_ZONE_ACCESS_MODES;

	const selectedCount = FIREWALL_ZONE_ACCESS_MODE_IDS.filter(
		id => selectedModes[id]
	).length;
	const allSelected =
		selectedCount === FIREWALL_ZONE_ACCESS_MODE_IDS.length;
	const someSelected = selectedCount > 0 && !allSelected;

	const accessMode = getFirewallZoneAccessMode(selectedModes);

	const commitSelection = (
		nextModes: Record<FirewallZoneAccessModeId, boolean>
	) => {
		if (!activeZone) {
			return;
		}

		dispatch(
			updateFirewallZone({
				id: activeZone.id,
				updates: {
					accessModes: nextModes
				}
			})
		);
	};

	const handleSelectAll = () => {
		const nextValue = !allSelected;
		commitSelection({
			nonSecureNonPrivileged: nextValue,
			nonSecurePrivileged: nextValue,
			secureNonPrivileged: nextValue,
			securePrivileged: nextValue
		});
	};

	const handleToggleMode = (id: FirewallZoneAccessModeId) => {
		commitSelection({...selectedModes, [id]: !selectedModes[id]});
	};

	return (
		<Card
			disableHoverEffects
			testId='firewall-zones:manage-access-modes'
		>
			<div className={styles.container}>
				<div className={styles.content}>
					<div className={styles.header}>
						<div className={styles.title}>
							<span>{l10n?.title}</span>
							<Badge
								className={styles.accessModeBadge}
								appearance={
									FIREWALL_ZONE_ACCESS_MODE_BADGE_APPEARANCE[
										accessMode
									]
								}
								dataTest='firewall-zones:manage-access-modes:access-mode'
							>
								{FIREWALL_ZONE_ACCESS_MODE_LABELS[accessMode]}
							</Badge>
							{l10n?.tooltip ? (
								<Tooltip
									title={l10n.tooltip}
									type='long'
									dataTest='firewall-zones:manage-access-modes:info'
									position='bottom'
								>
									<button
										type='button'
										className={styles.infoIcon}
										aria-label={l10n.infoLabel}
									>
										<InfoIcon />
									</button>
								</Tooltip>
							) : null}
						</div>
						<div className={styles.subtitle}>{l10n?.subtitle}</div>
					</div>
					<div className={styles.accessModes}>
						<div className={styles.selectAll}>
							<CheckBox
								checked={allSelected}
								indeterminate={someSelected}
								dataTest='firewall-zones:manage-access-modes:select-all'
								onClick={handleSelectAll}
							>
								{l10n?.selectAll}
							</CheckBox>
						</div>
						<div className={styles.accessModeList}>
							{FIREWALL_ZONE_ACCESS_MODE_IDS.map(id => (
								<CheckBox
									key={id}
									checked={selectedModes[id]}
									dataTest={`firewall-zones:manage-access-modes:${id}`}
									onClick={() => {
										handleToggleMode(id);
									}}
								>
									{l10n?.accessModes?.[id]}
								</CheckBox>
							))}
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

export default ManageAccessModes;
