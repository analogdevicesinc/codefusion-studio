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
import {getProjectInfoList} from '../utils/config';
import type {ProjectInfo} from '../utils/config';
import type {ControlCfg} from '../../../common/types/soc';
import {
	useGasketErrors,
	useStreamErrors
} from '../state/slices/gaskets/gasket.selector';
import {useTotalApplicationPackagesErrorCount} from './use-total-application-packages-error-count';

export type TCodeGenError = {
	peripheralAllocErr: number;
	pinConfigErr: number;
	clockConfigErr: number;
	dfgErr: number;
	mcubootErr: number;
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

	const peripheralErrorsByProject =
		useProjectsPeripheralAssignmentsErrors(
			allocations,
			projectsControls
		);

	const clockConfigError = clockErrorSummary.totalErrors;

	const errorsMap = useMemo(() => {
		const map = new Map<string, TCodeGenError>();

		projects.forEach((project: ProjectInfo) => {
			const peripheralAllocErr =
				peripheralErrorsByProject[project.ProjectId] ?? 0;
			const pinConfigErr = pinErrors.get(project.ProjectId) ?? 0;
			const clockConfigErr = clockConfigError;

			const dfgErrorCount = [
				...Object.values(gasketErrors),
				...Object.values(streamErrors)
			].reduce((acc, curr) => acc + curr.length, 0);

			map.set(project.ProjectId, {
				peripheralAllocErr,
				pinConfigErr,
				clockConfigErr,
				dfgErr: dfgErrorCount,
				mcubootErr: mcubootErrors
			});
		});

		return map;
	}, [
		projects,
		peripheralErrorsByProject,
		pinErrors,
		clockConfigError,
		gasketErrors,
		streamErrors,
		mcubootErrors
	]);

	return errorsMap;
}
