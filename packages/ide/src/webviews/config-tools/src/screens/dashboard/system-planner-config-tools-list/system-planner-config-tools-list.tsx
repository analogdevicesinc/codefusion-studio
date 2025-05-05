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

import {
	Card,
	ClockConfigIcon,
	GenerateIcon,
	MemoryLayoutIcon,
	PinmuxIcon,
	RegistersIcon,
	PeripheralsIcon,
	CfsSuspense
} from 'cfs-react-library';
import ChevronRight from '../../../../../common/icons/ChevronRight';
import {useAppDispatch} from '../../../state/store';
import {setActiveScreen} from '../../../state/slices/app-context/appContext.reducer';
import {type NavigationItem} from '../../../../../common/types/navigation';
import {navigationItems} from '../../../../../common/constants/navigation';
import styles from './system-planner-config-tools-list.module.scss';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	useClockNodesConfig,
	useDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {useEvaluateClockCondition} from '../../../hooks/use-evaluate-clock-condition';
import {usePeripheralControlsPerProjects} from '../../../hooks/use-peripheral-controls-per-projects';
import {computeClockNodeErr} from '../../../utils/node-error';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {getAssignedPinErrors} from '../../../utils/pin-error';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {getProjectInfoList} from '../../../utils/config';
import PeripheralErrorIcon from './peripheral-error-icon';

function SystemPlannerConfigToolsList() {
	const dispatch = useAppDispatch();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.dashboard?.system_config_tools;

	const clockConfig = useClockNodesConfig();
	const diagramData = useDiagramData();
	const computeEnabledState = useEvaluateClockCondition();
	const assignedPins = useAssignedPins();
	const {conflictsCount, hasFunctionConfigErrors} =
		getAssignedPinErrors(assignedPins, 0);

	const projects = getProjectInfoList() ?? [];
	const projectIds = projects.map(project => project.ProjectId);
	const controlsPromises =
		usePeripheralControlsPerProjects(projectIds);

	const handleLinkClick = (id: NavigationItem) => {
		dispatch(setActiveScreen(id));
	};

	return (
		<div className={styles.configurationToolsContainer}>
			<h2>{i10n?.title}</h2>
			<div className={styles.configurationToolsList}>
				<Card id={navigationItems.pinmux} testId='peripheral-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.peripherals);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<PeripheralsIcon width={16} height={16} />
								<div>{i10n?.['allocate-peripherals']} </div>
							</div>
							<div className={styles.cardEnd}>
								<CfsSuspense>
									<PeripheralErrorIcon
										projectIds={projectIds ?? []}
										controlsPromises={controlsPromises}
									/>
								</CfsSuspense>
								<div className={styles.chevronIcon}>
									<ChevronRight />
								</div>
							</div>
						</div>
					</div>
				</Card>
				<Card id={navigationItems.pinmux} testId='pinmux-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.pinmux);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<PinmuxIcon />
								<div>{i10n?.['assign-pins']}</div>
							</div>
							<div className={styles.cardEnd}>
								{(conflictsCount > 0 || hasFunctionConfigErrors) && (
									<ConflictIcon data-test='pinmux-error' />
								)}
								<div className={styles.chevronIcon}>
									<ChevronRight />
								</div>
							</div>
						</div>
					</div>
				</Card>
				<Card id={navigationItems.clockConfig} testId='clock-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.clockConfig);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<ClockConfigIcon />
								<div>{i10n?.['configure-clocks']}</div>
							</div>
							<div className={styles.cardEnd}>
								{Boolean(
									computeClockNodeErr(
										clockConfig,
										diagramData,
										computeEnabledState
									)
								) && <ConflictIcon data-test='clock-config-error' />}
								<div className={styles.chevronIcon}>
									<ChevronRight />
								</div>
							</div>
						</div>
					</div>
				</Card>
				<Card id={navigationItems.memory} testId='memory-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.memory);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<MemoryLayoutIcon />
								<div>{i10n?.['partition-memory']}</div>
							</div>
							<div className={styles.chevronIcon}>
								<ChevronRight />
							</div>
						</div>
					</div>
				</Card>
				<Card id={navigationItems.registers} testId='registers-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.registers);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<RegistersIcon />
								<div>{i10n?.registers}</div>
							</div>
							<div className={styles.chevronIcon}>
								<ChevronRight />
							</div>
						</div>
					</div>
				</Card>
				<Card id={navigationItems.generate} testId='generate-card'>
					<div
						className={styles.configCard}
						onClick={() => {
							handleLinkClick(navigationItems.generate);
						}}
					>
						<div className={styles.cardContainer}>
							<div className={styles.cardDetails}>
								<GenerateIcon />
								<div>{i10n?.['generate-code']}</div>
							</div>
							<div className={styles.chevronIcon}>
								<ChevronRight />
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}

export default SystemPlannerConfigToolsList;
