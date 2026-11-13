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

import {useMemo} from 'react';
import {useClockConfigErrorsSummary} from '../state/slices/clock-nodes/clockNodes.selector';
import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';
import {useProjectsPeripheralAssignmentsErrors} from './use-projects-peripheral-assignments-errors-count';
import {usePinErrors} from './use-pin-errors';
import {useProfilingErrors} from './use-profiling-errors';
import {getProjectInfoList} from '../utils/config';
import type {ProjectInfo} from '../utils/config';
import type {ControlCfg} from '../../../common/types/soc';
import {
	useGasketErrors,
	useStreamErrors
} from '../state/slices/gaskets/gasket.selector';
import {useTotalApplicationPackagesErrorCount} from './use-total-application-packages-error-count';
import {useFirewallCodeGenErrorCount} from '../state/slices/firewall/firewall.selector';
import {useScopeConflictsByControlScope} from '../state/slices/scopes/scopes.selector';
import {CONTROL_SCOPES} from '../constants/scopes';

export type TCodeGenError = {
	memoryAllocErr: number;
	peripheralAllocErr: number;
	pinConfigErr: number;
	clockConfigErr: number;
	dfgErr: number;
	mcubootErr: number;
	firewallErr: number;
	profilingErr: number;
};

export function useSystemErrorsCount({
	projectsControls
}: Readonly<{
	projectsControls: Record<string, Record<string, ControlCfg[]>>;
}>) {
	const projects = useMemo(() => getProjectInfoList() ?? [], []);
	const allocations = usePeripheralAllocations();
	const pinErrors = usePinErrors();
	const gasketErrors = useGasketErrors();
	const streamErrors = useStreamErrors();
	const clockErrorSummary = useClockConfigErrorsSummary();
	const mcubootErrors = useTotalApplicationPackagesErrorCount();
	const firewallErrors = useFirewallCodeGenErrorCount();
	const profilingErrors = useProfilingErrors();
	const memoryScopeConflicts = useScopeConflictsByControlScope(
		CONTROL_SCOPES.MEMORY
	);

	const peripheralErrorsByProject =
		useProjectsPeripheralAssignmentsErrors(
			allocations,
			projectsControls
		);

	const errorsMap = useMemo(() => {
		const map = new Map<string, TCodeGenError>();

		const dfgErrorCount = [
			...Object.values(gasketErrors),
			...Object.values(streamErrors)
		].reduce((acc, curr) => acc + curr.length, 0);

		projects.forEach((project: ProjectInfo) => {
			const memoryAllocErr = memoryScopeConflicts.filter(conflict =>
				conflict.entries.some(
					entry => entry.projectId === project.ProjectId
				)
			).length;
			const peripheralAllocErr =
				peripheralErrorsByProject[project.ProjectId] ?? 0;

			const pinConfigErr = pinErrors.get(project.ProjectId) ?? 0;

			const clockConfigErr =
				!project.ExternallyManaged &&
				clockErrorSummary.primaryProjectId === project.ProjectId
					? clockErrorSummary.totalErrors
					: 0;

			const profilingErr =
				profilingErrors.get(project.ProjectId) ?? 0;

			map.set(project.ProjectId, {
				memoryAllocErr,
				peripheralAllocErr,
				pinConfigErr,
				clockConfigErr,
				dfgErr: dfgErrorCount,
				mcubootErr: mcubootErrors,
				firewallErr: firewallErrors,
				profilingErr
			});
		});

		return map;
	}, [
		projects,
		memoryScopeConflicts,
		peripheralErrorsByProject,
		pinErrors,
		clockErrorSummary.primaryProjectId,
		clockErrorSummary.totalErrors,
		gasketErrors,
		streamErrors,
		mcubootErrors,
		firewallErrors,
		profilingErrors
	]);

	return errorsMap;
}
