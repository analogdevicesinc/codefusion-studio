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
import {Button, CfsSuspense, SlidingPanel} from 'cfs-react-library';
import {useCallback, useMemo, useState} from 'react';

import {
	setEditingGasket,
	setSelectedGaskets,
	setSelectedStreams,
	updateGasketOptions
} from '../../../state/slices/gaskets/gasket.reducer';
import styles from './gasket-config-sidepanel.module.scss';
import {useEditingGasket} from '../../../state/slices/gaskets/gasket.selector';
import {DFGControlsView} from '../common/dfg-controls-view';
import {getProjectInfoList} from '../../../utils/config';
import {getControlsForProjectIds} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {useAppDispatch} from '../../../state/store';
import type {GasketConfig} from 'cfs-types';
import {getGasketDictionary} from '../../../utils/dfg';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {useScopes} from '../../../state/slices/scopes/scopes.selector';
import {type ScopeValidationOptions} from '../../../utils/plugin-options-validation';
import {localizeMessage} from '../../../../../common/utils/localization';
import {type TLocaleContext} from '../../../common/types/context';

export function GasketConfigSidePanel() {
	const activeGasket: GasketConfig | undefined = useEditingGasket();
	const dispatch = useAppDispatch();

	const i10n: TLocaleContext | undefined = useLocaleContext()?.dfg;
	const scopes = useScopes();

	const [gasketModified, setGasketModified] = useState(false);

	const closeSidePanel = useCallback(() => {
		dispatch(setEditingGasket(undefined));
		dispatch(setSelectedStreams([]));
		dispatch(setSelectedGaskets([]));
		setGasketModified(false);
	}, [dispatch]);

	const controlsPrms = useMemo(async () => {
		const projects = getProjectInfoList() ?? [];
		const primaryProjects = projects.filter(p => p.IsPrimary);
		const projectIds = (
			primaryProjects.length ? primaryProjects : projects.slice(0, 1)
		).map(p => p.ProjectId);

		const ctls = await getControlsForProjectIds(
			projectIds,
			CONTROL_SCOPES.DFG
		);

		return ctls;
	}, []);

	const config = useMemo(() => {
		const gasket = getGasketDictionary()[activeGasket?.Name ?? ''];

		return gasket?.Config ?? {};
	}, [activeGasket]);

	const formatScopeConflictMessage = useCallback<
		ScopeValidationOptions['formatConflictMessage']
	>(
		({value, conflictingItems}) =>
			localizeMessage(i10n, 'scope-conflict.error', {
				value,
				conflictingItems
			}),
		[i10n]
	);

	const scopeValidation = useMemo<
		ScopeValidationOptions | undefined
	>(() => {
		const projects = getProjectInfoList() ?? [];
		const project = projects.find(p => p.IsPrimary) ?? projects[0];

		if (!activeGasket || !project) {
			return undefined;
		}

		return {
			scopes,
			controlScope: CONTROL_SCOPES.DFG,
			projectId: project.ProjectId,
			itemId: activeGasket.Name,
			getConfigPath: controlId =>
				`DFG.Gaskets.${activeGasket.Name}.Config.${controlId}`,
			formatConflictMessage: formatScopeConflictMessage
		};
	}, [activeGasket, formatScopeConflictMessage, scopes]);

	return (
		<SlidingPanel
			title='Gasket Settings'
			isMinimised={!activeGasket}
			closeSlider={() => {
				closeSidePanel();
			}}
			footer={
				<div className={styles.footer}>
					<Button
						id='sidepanel-edit-gasket'
						disabled={!gasketModified}
						onClick={() => {
							if (activeGasket) {
								dispatch(updateGasketOptions(activeGasket));
								closeSidePanel();
							}
						}}
					>
						Update
					</Button>
				</div>
			}
		>
			{activeGasket && (
				<div className={styles.gasketConfigPanel}>
					<h5>GENERAL</h5>
					<CfsSuspense>
						<DFGControlsView
							controlsPrms={controlsPrms}
							propertyName={`${activeGasket?.Name} DFGGasketConfig`}
							data={activeGasket.Config ?? {}}
							socConfig={config}
							testId='gasket-config-controls'
							emptyMessage={i10n?.noGasketPluginSettings}
							scopeValidation={scopeValidation}
							onControlChange={(field, value) => {
								const currentConfig = activeGasket.Config ?? {};

								const updatedConfig =
									value === undefined
										? Object.fromEntries(
												Object.entries(currentConfig).filter(
													([key]) => key !== field
												)
											)
										: {
												...currentConfig,
												[field]: value
											};

								dispatch(
									setEditingGasket({
										Name: activeGasket.Name,
										Config: updatedConfig
									})
								);

								setGasketModified(true);
							}}
						/>
					</CfsSuspense>
				</div>
			)}
		</SlidingPanel>
	);
}
