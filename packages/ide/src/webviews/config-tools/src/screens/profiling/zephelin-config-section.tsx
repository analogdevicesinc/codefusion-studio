/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {CheckBox, DropDown} from 'cfs-react-library';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {useProfilingConfig} from '../../state/slices/profiling/profiling.selector';
import {getUARTPorts} from '../../state/slices/profiling/profilingPeripherals';
import {useAppDispatch} from '../../state/store';
import {getCfsConfigDict} from '../../utils/config';
import styles from './profiling.module.scss';
import Toggle from '../../../../common/components/toggle/Toggle';
import {
	setUARTPort,
	toggleAIProfilingEnabled,
	toggleProfilingEnabled
} from '../../state/slices/profiling/profiling.reducer';

type ConfigSectionProps = {
	projectId: string;
};

export function ZephelinConfigSection({
	projectId
}: ConfigSectionProps) {
	const config = useProfilingConfig(projectId);
	const dispatch = useAppDispatch();
	const project = getCfsConfigDict()?.projects.find(
		p => p.ProjectId === projectId
	);
	const l10n = useLocaleContext()?.profiling;

	if (!config || !project) {
		return <></>;
	}

	const uartPorts = getUARTPorts();

	return (
		<section className={styles.section}>
			<div className={styles.sectionHeader}>
				<div>
					<h2>{project.Name}</h2>
				</div>
				<div>
					<Toggle
						isToggledOn={Boolean(config.Enabled)}
						handleToggle={() =>
							dispatch(
								toggleProfilingEnabled({
									projectId,
									enabled: !config.Enabled
								})
							)
						}
					/>
					<span className={styles.label}>
						{l10n?.enableProfiling}
					</span>
				</div>
			</div>
			<hr />
			<div className={styles.settings}>
				<div className={styles.fieldWithLabel}>
					<span
						className={`${styles.label} ${!config.Enabled && styles.disabledLabel}`}
					>
						{l10n?.selectPort}
					</span>
					<DropDown
						isDisabled={!config.Enabled}
						controlId={`uartSelect-${projectId}`}
						currentControlValue={
							config.Port !== undefined
								? uartPorts[config.Port].Name
								: undefined
						}
						options={Object.values(uartPorts).map(p => ({
							value: p.Name,
							label: p.Name
						}))}
						onHandleDropdown={selection =>
							dispatch(
								setUARTPort({
									projectId,
									port: parseInt(selection.substring(4))
								})
							)
						}
					/>
				</div>
				{project.Ai && (
					<CheckBox
						isDisabled={!config.Enabled}
						checked={config.AIEnabled}
						onClick={() =>
							dispatch(
								toggleAIProfilingEnabled({
									projectId,
									enabled: !config.AIEnabled
								})
							)
						}
					>
						{l10n?.enableAIProfiling}
					</CheckBox>
				)}
			</div>
		</section>
	);
}
