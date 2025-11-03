import {useMemo} from 'react';
import {
	useClockNodesConfig,
	useDiagramData
} from '../state/slices/clock-nodes/clockNodes.selector';
import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';
import {useEvaluateClockCondition} from './use-evaluate-clock-condition';
import {useProjectsPeripheralAssignmentsErrors} from './use-projects-peripheral-assignments-errors-count';
import {usePinErrors} from './use-pin-errors';
import {computeClockNodeErr} from '../utils/node-error';
import {getProjectInfoList} from '../utils/config';
import type {ProjectInfo} from '../utils/config';
import type {ControlCfg} from '../../../common/types/soc';
import {
	useGasketErrors,
	useStreamErrors
} from '../state/slices/gaskets/gasket.selector';

export type TCodeGenError = {
	peripheralAllocErr: number;
	pinConfigErr: number;
	clockConfigErr: number;
	dfgErr: number;
};

export function useSystemErrorsCount({
	projectsControls
}: Readonly<{
	projectsControls: Record<string, Record<string, ControlCfg[]>>;
}>) {
	const projects = useMemo(() => getProjectInfoList() ?? [], []);
	const clockConfig = useClockNodesConfig();
	const diagramData = useDiagramData();
	const computeEnabledState = useEvaluateClockCondition();
	const allocations = usePeripheralAllocations();
	const pinErrors = usePinErrors();
	const gasketErrors = useGasketErrors();
	const streamErrors = useStreamErrors();

	const peripheralErrorsByProject =
		useProjectsPeripheralAssignmentsErrors(
			allocations,
			projectsControls
		);

	const clockConfigError = useMemo(
		() =>
			computeClockNodeErr(
				clockConfig,
				diagramData,
				computeEnabledState
			) || 0,
		[clockConfig, diagramData, computeEnabledState]
	);

	const errorsMap = useMemo(() => {
		const map = new Map<string, TCodeGenError>();

		projects.forEach((project: ProjectInfo) => {
			const peripheralAllocErr =
				peripheralErrorsByProject[project.ProjectId] ?? 0;
			const pinConfigErr = pinErrors.get(project.ProjectId) ?? 0;
			const clockConfigErr = clockConfigError;
			let dfgErrorCount = 0;

			// DFG errors are only counted on the primary project
			if (project.IsPrimary) {
				dfgErrorCount = Object.values(gasketErrors).reduce(
					(acc, curr) => acc + curr.length,
					0
				);
				dfgErrorCount += Object.values(streamErrors).reduce(
					(acc, curr) => acc + curr.length,
					0
				);
			}

			map.set(project.ProjectId, {
				peripheralAllocErr,
				pinConfigErr,
				clockConfigErr,
				dfgErr: dfgErrorCount
			});
		});

		return map;
	}, [
		projects,
		peripheralErrorsByProject,
		pinErrors,
		clockConfigError,
		gasketErrors,
		streamErrors
	]);

	return errorsMap;
}
