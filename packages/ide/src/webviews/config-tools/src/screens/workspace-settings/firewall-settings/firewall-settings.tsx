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
import {
	Button,
	Radio,
	RadioGroup,
	TextField
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {selectFile} from '../../../../../common/api';
import {navigationItems} from '../../../../../common/constants/navigation';
import {FIREWALL_STATUS_OPTIONS} from '../../../constants/workspace-settings';
import {setActiveScreen} from '../../../state/slices/app-context/appContext.reducer';
import {
	setFirewallBinaryFilePath,
	setFirewallStatus
} from '../../../state/slices/firewall/firewall.reducer';
import {
	useFirewallBinaryFilePath,
	useFirewallStatus
} from '../../../state/slices/firewall/firewall.selector';
import {useAppDispatch} from '../../../state/store';
import type {FirewallStatusOption} from '../../../types/firewall';
import sectionStyles from '../security-settings/workspace-security-settings.module.scss';
import styles from './firewall-settings.module.scss';

// Shares the firewall slice with the firewall overview screen so both stay in sync.
function FirewallSettings() {
	const dispatch = useAppDispatch();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['firewall-settings'];

	const firewallStatus = useFirewallStatus();
	const firewallBinaryFilePath = useFirewallBinaryFilePath();

	const handleBrowseBinaryFile = useCallback(async () => {
		const rawPath = await selectFile({
			filters: {'Binary Files': ['bin']}
		});

		if (rawPath) {
			dispatch(
				setFirewallBinaryFilePath(rawPath.replace(/\\/g, '/'))
			);
		}
	}, [dispatch]);

	return (
		<div
			id='firewall-status'
			data-test='workspace-setting:firewall-status'
			className={sectionStyles.sectionContainer}
		>
			<div className={sectionStyles.titleContainer}>
				<div className={sectionStyles.title}>{i10n?.title}</div>
				<div className={styles.firewallNav}>
					<Button
						appearance='icon'
						dataTest='navigate-to-firewall-config'
						onClick={() => {
							dispatch(
								setActiveScreen(navigationItems.firewallConfig)
							);
						}}
					>
						{i10n?.['config-firewall']}
					</Button>
				</div>
			</div>
			<div
				className={styles.container}
				data-test='workspace-setting:firewall-status-settings'
			>
				<div className={styles.contentWrapper}>
					<div className={styles.title} id='firewall-enable-title'>
						{i10n?.enableTitle}
					</div>
					<RadioGroup
						className={styles.content}
						onChange={e => {
							const {checked, value} = e.target as HTMLInputElement;

							if (checked && value) {
								dispatch(
									setFirewallStatus(value as FirewallStatusOption)
								);
							}
						}}
					>
						{FIREWALL_STATUS_OPTIONS.map(option => (
							<div
								key={option.value}
								className={styles.enableSection}
								data-test={`workspace-setting:firewall-status-${option.value}`}
								onClick={() => {
									dispatch(
										setFirewallStatus(
											option.value as FirewallStatusOption
										)
									);
								}}
							>
								<div className={styles.header}>
									<Radio
										checked={firewallStatus === option.value}
										value={option.value}
									>
										{i10n?.[`${option.value}Label`] ?? option.label}
									</Radio>
								</div>
								<div className={styles.description}>
									{i10n?.[option.value]}
								</div>
							</div>
						))}
					</RadioGroup>
				</div>
			</div>
			<div
				className={styles.binaryFileSection}
				data-test='workspace-setting:firewall-binary-file'
			>
				<div className={styles.title} id='firewall-binary-file-title'>
					{i10n?.binaryFileTitle}
				</div>
				<div className={styles.binaryFileField}>
					<TextField
						fullWidth
						inputVal={firewallBinaryFilePath}
						placeholder={i10n?.binaryFilePlaceholder}
						dataTest='firewall-settings:binary-file'
						startSlot={
							<Button
								appearance='icon'
								onClick={handleBrowseBinaryFile}
							>
								{i10n?.browse}
							</Button>
						}
						onInputChange={value => {
							dispatch(setFirewallBinaryFilePath(value));
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export default FirewallSettings;
