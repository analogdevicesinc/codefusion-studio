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
	EmbeddedAiToolsIcon,
	FirewallConfigIconSmall,
	MCUBootIconSmall,
	SignalRoutingUnitIcon
} from 'cfs-react-library';
import ChevronRight from '../../../../../common/icons/ChevronRight';
import {useAppDispatch} from '../../../state/store';
import {setActiveScreen} from '../../../state/slices/app-context/appContext.reducer';
import {type NavigationItem} from '../../../../../common/types/navigation';
import {navigationItems} from '../../../../../common/constants/navigation';
import styles from './system-planner-config-tools-list.module.scss';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {useClockConfigErrorsSummary} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {usePeripheralControlsPerProjects} from '../../../hooks/use-peripheral-controls-per-projects';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {getAssignedPinErrors} from '../../../utils/pin-error';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {
	getProjectInfoList,
	getSupportsFirewall,
	getSupportsMCUboot
} from '../../../utils/config';
import PeripheralErrorIcon from './peripheral-error-icon';
import {
	useGasketErrors,
	useStreamErrors
} from '../../../state/slices/gaskets/gasket.selector';
import {getGasketDictionary} from '../../../utils/dfg';
import {getClockNodeDictionary} from '../../../utils/clock-nodes';
import {getCoreMemoryDictionary} from '../../../utils/memory';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {getSocPeripheralDictionary} from '../../../utils/soc-peripherals';
import {getAICores} from '../../../utils/ai-tools';
import {ProfilingIconSmall} from '../../../../../common/icons/Profiling';
import {useTotalApplicationPackagesErrorCount} from '../../../hooks/use-total-application-packages-error-count';
import {useFirewallCodeGenErrorCount} from '../../../state/slices/firewall/firewall.selector';
import {useHasScopeConflictsByControlScope} from '../../../state/slices/scopes/scopes.selector';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {useDfgScopeConflictItemIds} from '../../../hooks/use-dfg-scope-conflicts';

/**
 * Renders the Firewall config card when the current SoC supports Firewall.
 *
 * @param props - Component props.
 * @param props.label - Localized label for the card.
 * @param props.conflictLabel - Localized accessible label for the conflict icon.
 * @param props.onNavigate - Callback invoked to navigate to a screen.
 * @returns The Firewall config card, or `null` when Firewall is not supported.
 */
function FirewallConfigCard({
	label,
	conflictLabel,
	errorCount,
	onNavigate
}: {
	readonly label: string | undefined;
	readonly conflictLabel: string;
	readonly errorCount: number;
	readonly onNavigate: (id: NavigationItem) => void;
}) {
	if (!getSupportsFirewall()) {
		return null;
	}

	return (
		<Card id={navigationItems.firewallConfig} testId='firewall-card'>
			<div
				className={styles.configCard}
				onClick={() => {
					onNavigate(navigationItems.firewallConfig);
				}}
			>
				<div className={styles.cardContainer}>
					<div className={styles.cardDetails}>
						<FirewallConfigIconSmall />
						<div>{label}</div>
					</div>
					<div className={styles.cardEnd}>
						{errorCount > 0 && (
							<ConflictIcon
								data-test='firewall-error'
								role='img'
								aria-label={conflictLabel}
							/>
						)}
						<div className={styles.chevronIcon}>
							<ChevronRight />
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

// eslint-disable-next-line complexity
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
	const sruAvailable = Object.values(
		getSocPeripheralDictionary()
	).some(peripheral => peripheral.sru);
	const hasMemoryScopeConflicts = useHasScopeConflictsByControlScope(
		CONTROL_SCOPES.MEMORY
	);
	const hasPinScopeConflicts = useHasScopeConflictsByControlScope(
		CONTROL_SCOPES.PIN_CONFIG
	);
	const dfgScopeConflictItemIds = useDfgScopeConflictItemIds();
	// Only show pinmux if there is more than one pin in the SoC package.
	// Sometimes to keep Yoda/Soc Schema happy, we populate one dummy pin but the package is still unsupported.
	const pinmuxAvailable =
		Object.keys(getSocPinDictionary()).length > 1;
	const clockErrorSummary = useClockConfigErrorsSummary();
	const assignedPins = useAssignedPins();
	const {conflictsCount, hasFunctionConfigErrors} =
		getAssignedPinErrors(assignedPins, 0);
	const aiCores = getAICores();
	const isSupportedSoc = getSupportsMCUboot();
	const mcubootErrorCount = useTotalApplicationPackagesErrorCount();
	const firewallErrorCount = useFirewallCodeGenErrorCount();

	const gasketErrors = useGasketErrors();
	const streamErrors = useStreamErrors();

	const projects = getProjectInfoList() ?? [];
	const projectIds = projects.map(project => project.ProjectId);
	const showMcubootConfig =
		projects.some(p => p.FirmwarePlatform === 'zephyr') &&
		isSupportedSoc;
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
										hasFunctionConfigErrors ||
										hasPinScopeConflicts) && (
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
									{clockErrorSummary.totalErrors > 0 && (
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
										Object.keys(streamErrors).length > 0 ||
										dfgScopeConflictItemIds.size > 0) && (
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
								<div className={styles.cardEnd}>
									{hasMemoryScopeConflicts && (
										<ConflictIcon data-test='memory-allocation-error' />
									)}
									<div className={styles.chevronIcon}>
										<ChevronRight />
									</div>
								</div>
							</div>
						</div>
					</Card>
				)}
				{sruAvailable && (
					<Card
						id={navigationItems.signalRoutingUnit}
						testId='signal-routing-unit-card'
					>
						<div
							className={styles.configCard}
							onClick={() => {
								handleLinkClick(navigationItems.signalRoutingUnit);
							}}
						>
							<div className={styles.cardContainer}>
								<div className={styles.cardDetails}>
									<SignalRoutingUnitIcon />
									<div>{i10n?.['signal-routing-unit']}</div>
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
				<FirewallConfigCard
					label={i10n?.['firewall-config']}
					conflictLabel={i10n?.['conflict-label'] ?? 'Has conflicts'}
					errorCount={firewallErrorCount}
					onNavigate={handleLinkClick}
				/>
				{showMcubootConfig && (
					<Card
						id={navigationItems.mcubootConfig}
						testId='mcuboot-card'
					>
						<div
							className={styles.configCard}
							onClick={() => {
								handleLinkClick(navigationItems.mcubootConfig);
							}}
						>
							<div className={styles.cardContainer}>
								<div className={styles.cardDetails}>
									<MCUBootIconSmall />
									<div>{i10n?.['mcuboot-config']}</div>
								</div>
								<div className={styles.cardEnd}>
									{mcubootErrorCount > 0 && (
										<ConflictIcon data-test='mcuboot-error' />
									)}
									<div className={styles.chevronIcon}>
										<ChevronRight />
									</div>
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
									<div>
										{i10n?.profiling}{' '}
										<Badge appearance='primary'>BETA</Badge>
									</div>
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
