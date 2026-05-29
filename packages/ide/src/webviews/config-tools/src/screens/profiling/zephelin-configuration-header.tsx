/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import Toggle from '../../../../common/components/toggle/Toggle';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {toggleProfilingEnabled} from '../../state/slices/profiling/profiling.reducer';
import {
	usePeripheralAllocationBaudRate,
	useProfilingConfig
} from '../../state/slices/profiling/profiling.selector';
import {useAppDispatch} from '../../state/store';
import {type ProjectInfo} from '../../utils/config';
import styles from './zephelin-configuration-header.module.scss';
import ConflictIcon from '../../../../common/icons/Conflict';
import ZephelinConfigurationBody from './zephelin-configuration-body';
import {Accordion, Badge} from 'cfs-react-library';
import {type Zephelin} from 'cfs-types';

type Props = {
	readonly project: ProjectInfo;
	readonly isExpanded: boolean;
	readonly onToggleExpand: (projectId: string) => void;
};

export default function ZephelinConfigurationHeader({
	project,
	isExpanded,
	onToggleExpand
}: Props) {
	const {zephelin, errors} = useProfilingConfig(project.ProjectId);
	const baudRate = usePeripheralAllocationBaudRate(zephelin.Port);

	if (!zephelin) {
		return null;
	}

	const isInvalid =
		Object.values(errors).some(error => error !== undefined) ||
		baudRate === undefined;

	return (
		<Accordion
			dataTest={`profiling-zephelin-config:${project.CoreId}`}
			open={isExpanded}
			title={
				<Header
					project={project}
					zephelin={zephelin}
					isInvalid={isInvalid}
				/>
			}
			className={`${project.ExternallyManaged ? styles.disabled : ''}`}
			onToggle={() => {
				onToggleExpand(project.ProjectId);
			}}
		>
			<ZephelinConfigurationBody
				projectId={project.ProjectId}
				coreId={project.CoreId}
				zephelin={zephelin}
				errors={errors}
				baudRate={baudRate}
			/>
		</Accordion>
	);
}

type HeaderProps = {
	readonly project: ProjectInfo;
	readonly zephelin: Partial<Zephelin>;
	readonly isInvalid: boolean;
};

function Header({project, zephelin, isInvalid}: HeaderProps) {
	const dispatch = useAppDispatch();
	const l10n = useLocaleContext()?.profiling;

	return (
		<header className={styles.header}>
			<div className={styles.title}>
				<h2>{project.Name}</h2>
				{project.ExternallyManaged && (
					<Badge appearance='secondary'>
						{l10n.externallyManaged}
					</Badge>
				)}
			</div>

			{!project.ExternallyManaged && (
				<div className={styles.headerControls}>
					{Boolean(zephelin.Enabled) && isInvalid && <ConflictIcon />}
					<p className={styles.label}>{l10n.enableProfiling}</p>
					<Toggle
						isToggledOn={Boolean(zephelin.Enabled)}
						dataTest='enable-profiling-toggle'
						handleToggle={() =>
							dispatch(
								toggleProfilingEnabled({
									projectId: project.ProjectId,
									enabled: !zephelin.Enabled
								})
							)
						}
					/>
				</div>
			)}
		</header>
	);
}
