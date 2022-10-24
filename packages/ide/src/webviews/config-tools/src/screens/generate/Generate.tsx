/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import CodeGenerationContainer from './code-generation-container/CodeGenerationContainer';
import {useAssignedPins} from '../../state/slices/pins/pins.selector';
import {
	useClockNodesConfig,
	useDiagramData
} from '../../state/slices/clock-nodes/clockNodes.selector';
import CodeGenerationError from './code-generation-error/CodeGenerationError';
import {getCurrentNodeError} from '../../utils/node-error';
import {clockNodeDictionary} from '../../utils/clock-nodes';
import {useEvaluateClockCondition} from '../../hooks/use-evaluate-clock-condition';

export default function Generate() {
	const assignedPins = useAssignedPins();
	const clockConfig = useClockNodesConfig();
	const computeEnabledState = useEvaluateClockCondition();
	const diagramData = useDiagramData();

	const conflictsCount = assignedPins.filter(
		pin => pin.appliedSignals.length > 1
	).length;

	let nodeErrorsCount = 0;

	Object.values(clockConfig).forEach(node => {
		const isNodeEnabled = diagramData[node.Name]?.enabled;

		if (!isNodeEnabled) return;

		const nodeDetails = clockNodeDictionary[node.Name];

		const currentError = getCurrentNodeError(
			node,
			nodeDetails,
			computeEnabledState
		);

		if (currentError !== undefined) {
			nodeErrorsCount++;
		}
	});

	return conflictsCount || nodeErrorsCount ? (
		<CodeGenerationError
			pinConflicts={conflictsCount}
			hasClockErrors={Boolean(nodeErrorsCount)}
		/>
	) : (
		<CodeGenerationContainer />
	);
}
