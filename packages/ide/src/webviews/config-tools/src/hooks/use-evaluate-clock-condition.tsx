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
import {useClockNodesConfig} from '../state/slices/clock-nodes/clockNodes.selector';
import {useAssignedPins} from '../state/slices/pins/pins.selector';
import {evaluateClockCondition} from '../utils/rpn-expression-resolver';

export function useEvaluateClockCondition() {
	const nodesConfig = useClockNodesConfig();
	const assignedPins = useAssignedPins();

	const evaluateFn = (condition: string, currentNode?: string) =>
		evaluateClockCondition(
			{clockconfig: nodesConfig, assignedPins, currentNode},
			condition
		);

	return evaluateFn;
}
