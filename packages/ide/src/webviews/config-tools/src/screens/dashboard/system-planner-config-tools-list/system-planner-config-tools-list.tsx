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
	Badge,
	Card,
	ClockConfigIcon,
	GenerateIcon,
	MemoryLayoutIcon,
	PinmuxIcon,
	RegistersIcon,
	PeripheralsIcon,
	CfsSuspense,
	DataFlowGasketIcon,
	EmbeddedAiToolsIcon
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
import {
	useGasketErrors,
	useStreamErrors
} from '../../../state/slices/gaskets/gasket.selector';
import {getGasketDictionary} from '../../../utils/dfg';
import {getClockNodeDictionary} from '../../../utils/clock-nodes';
import {getCoreMemoryDictionary} from '../../../utils/memory';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {getAICores} from '../../../utils/ai-tools';
import {ProfilingIconSmall} from '../../../../../common/icons/Profiling';

function SystemPlannerConfigToolsList() {
	const dispatch = useAppDispatch();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.dashboard?.system_config_tools;

	const gasketsAvailable =
		Object.keys(getGasketDictionary()).length > 0;
	const clockNodesAvailable =
		Object.keys(getClockNodeDictionary()).length > 0;
	const memoryAvailable =
		Object.keys(getCoreMemoryDictionary()).length > 0;
	// Only show pinmux if there is more than one pin in the SoC package.
	// Sometimes to keep Yoda/Soc Schema happy, we populate one dummy pin but the package is still unsupported.
	const pinmuxAvailable =
		Object.keys(getSocPinDictionary()).length > 1;
	const clockConfig = useClockNodesConfig();
	const diagramData = useDiagramData();
	const computeEnabledState = useEvaluateClockCondition();
	const assignedPins = useAssignedPins();
	const {conflictsCount, hasFunctionConfigErrors} =
		getAssignedPinErrors(assignedPins, 0);
	const aiCores = getAICores();

	const gasketErrors = useGasketErrors();
	const streamErrors = useStreamErrors();

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
				{pinmuxAvailable && (
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
									{(conflictsCount > 0 ||
										hasFunctionConfigErrors) && (
										<ConflictIcon data-test='pinmux-error' />
									)}
									<div className={styles.chevronIcon}>
										<ChevronRight />
									</div>
								</div>
							</div>
						</div>
					</Card>
				)}
				{clockNodesAvailable && (
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
									) && (
										<ConflictIcon data-test='clock-config-error' />
									)}
									<div className={styles.chevronIcon}>
										<ChevronRight />
									</div>
								</div>
							</div>
						</div>
					</Card>
				)}
				{gasketsAvailable && (
					<Card id={navigationItems.dfg} testId='dfg-card'>
						<div
							className={styles.configCard}
							onClick={() => {
								handleLinkClick(navigationItems.dfg);
							}}
						>
							<div className={styles.cardContainer}>
								<div className={styles.cardDetails}>
									<DataFlowGasketIcon />
									<div>{i10n?.['configure-dfg']}</div>
								</div>
								<div className={styles.cardEnd}>
									{(Object.keys(gasketErrors).length > 0 ||
										Object.keys(streamErrors).length > 0) && (
										<ConflictIcon data-test='dfg-error' />
									)}
									<div className={styles.chevronIcon}>
										<ChevronRight />
									</div>
								</div>
							</div>
						</div>
					</Card>
				)}
				{memoryAvailable && (
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
				)}
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
				{aiCores?.length > 0 && (
					<Card id={navigationItems.generate} testId='aitools-card'>
						<div
							className={styles.configCard}
							onClick={() => {
								handleLinkClick(navigationItems.aiTools);
							}}
						>
							<div className={styles.cardContainer}>
								<div className={styles.cardDetails}>
									<EmbeddedAiToolsIcon />
									<div>{i10n?.['ai-tools']}</div>
								</div>
								<div className={styles.chevronIcon}>
									<ChevronRight />
								</div>
							</div>
						</div>
					</Card>
				)}
				{projects.some(p => p.FirmwarePlatform === 'zephyr') && (
					<Card id={navigationItems.generate} testId='aitools-card'>
						<div
							className={styles.configCard}
							onClick={() => {
								handleLinkClick(navigationItems.profiling);
							}}
						>
							<div className={styles.cardContainer}>
								<div className={styles.cardDetails}>
									<ProfilingIconSmall />
									<div>{i10n?.profiling} <Badge appearance='secondary'>BETA</Badge></div>
								</div>
								<div className={styles.chevronIcon}>
									<ChevronRight />
								</div>
							</div>
						</div>
					</Card>
				)}
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
