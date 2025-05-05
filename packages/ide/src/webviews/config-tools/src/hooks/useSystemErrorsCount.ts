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

export type TCodeGenError = {
	peripheralAllocErr: number;
	pinConfigErr: number;
	clockConfigErr: number;
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

			map.set(project.ProjectId, {
				peripheralAllocErr,
				pinConfigErr,
				clockConfigErr
			});
		});

		return map;
	}, [
		projects,
		peripheralErrorsByProject,
		pinErrors,
		clockConfigError
	]);

	return errorsMap;
}
