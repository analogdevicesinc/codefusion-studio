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
import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import {getFormattedClockFrequency} from '../utils/format-schematic-data';
import {
	evaluateClockCondition,
	getClockFrequencyDictionary
} from '../../../utils/rpn-expression-resolver';
import {gap, notchHeight} from '../constants/tooltip';
import type {DiagramNode} from '@common/types/soc';
import {extractClockPrefix} from '../utils/clock-nodes';
import {
	useClockNodesConfig,
	useClockNodeState
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {ShortDescErrors} from '../../../types/errorTypes';
import CfsNotification from '@common/components/cfs-notification/CfsNotification';

import styles from './NodeTooltip.module.scss';
import {useEvaluateClockCondition} from '../../../hooks/use-evaluate-clock-condition';
import {
	generateOutputValueErrorString,
	getCurrentNodeError
} from '../../../utils/node-error';
import {getClockNodeConfig} from '../../../utils/clock-nodes';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';

type PositionedNodeTooltipProps = {
	readonly hoveredNodeInfo: DiagramNode;
	readonly containerRef: React.RefObject<HTMLDivElement>;
};

function FrequencyDisplayItem({
	clockName,
	value,
	isFirstGroupItem
}: {
	readonly value: string;
	readonly isFirstGroupItem: boolean;
	readonly clockName?: string;
}) {
	return (
		<div
			className={`${styles.clockEntry}${isFirstGroupItem ? ` ${styles.firstGroupItem}` : ''}`}
		>
			{clockName && (
				<p data-test={clockName} className={styles.name}>
					{clockName}
				</p>
			)}
			{value}
		</div>
	);
}

function NodeTooltip({
	hoveredNodeInfo,
	containerRef
}: PositionedNodeTooltipProps) {
	const hoveredNode = document.getElementById(hoveredNodeInfo.id);
	const nodeDetails = getClockNodeConfig(hoveredNodeInfo.name);
	const nodeState = useClockNodeState(hoveredNodeInfo.name);
	const nodesConfig = useClockNodesConfig();
	const assignedPins = useAssignedPins();
	const computeOutputEnabledState = useEvaluateClockCondition();
	const clockFrequencyDictionary = getClockFrequencyDictionary();

	const nodeError = getCurrentNodeError(
		nodeState,
		computeOutputEnabledState
	);

	const shouldDisplayInputs =
		nodeDetails.Type.toLowerCase() === 'divider' ||
		nodeDetails.Type.toLowerCase() === 'multiplier';

	const {
		top: containerTop = 0,
		left: containerLeft = 0,
		bottom: containerBottom = 0
	} = containerRef.current?.getBoundingClientRect() ?? {};

	const {
		left: nodeLeft = 0,
		top: nodeTop = 0,
		bottom: nodeBottom = 0
	} = hoveredNode?.getBoundingClientRect() ?? {};

	let top: number | undefined =
		nodeBottom - containerTop + notchHeight + gap;
	let bottom;
	const left = nodeLeft - containerLeft;
	const tooltipHeigth = 150;

	if (
		containerRef.current &&
		nodeBottom + tooltipHeigth > containerBottom
	) {
		top = undefined;
		bottom = containerBottom - nodeTop + gap;
	}

	let currentGroupPrefix = extractClockPrefix(
		nodeDetails.Outputs[0]?.Name
	);

	const NodeOutputs = nodeDetails?.Outputs.filter(
		output =>
			!output.Condition ||
			evaluateClockCondition(
				{
					clockconfig: nodesConfig,
					currentNode: nodeDetails.Name,
					assignedPins
				},
				output.Condition
			)
	).map(output => {
		let isFirstGroupItem = false;

		const frequency = getFormattedClockFrequency(
			clockFrequencyDictionary[output.Name]
		);

		if (extractClockPrefix(output.Name) !== currentGroupPrefix) {
			currentGroupPrefix = extractClockPrefix(output.Name);
			isFirstGroupItem = true;
		}

		return (
			<FrequencyDisplayItem
				key={output.Name}
				clockName={
					nodeDetails.Outputs.length > 1 ? output.Name : undefined
				}
				value={frequency}
				isFirstGroupItem={isFirstGroupItem}
			/>
		);
	});

	const NodeInputs = shouldDisplayInputs
		? nodeDetails.Inputs?.map(input => (
				<FrequencyDisplayItem
					key={input.Name}
					value={getFormattedClockFrequency(
						clockFrequencyDictionary[input.Name]
					)}
					isFirstGroupItem={false}
				/>
			))
		: [];

	const ErrorBody = nodeError && (
		<>
			<CfsNotification
				testId='tooltip:notification:error'
				type='error'
				message={
					ShortDescErrors[
						nodeError?.[1] ?? ('' as keyof typeof ShortDescErrors)
					]
				}
			/>
			<ul className={styles.valueError}>
				<li data-test='tooltip:body:error-value'>
					{generateOutputValueErrorString(nodeError, nodeState)}
				</li>
			</ul>
		</>
	);

	const FrequencyInfoDisplay = (
		<div>
			{NodeInputs?.length ? (
				<>
					<div
						className={`${styles.sectionTitle} ${styles.inputsTitle}`}
						data-test='tooltip:inputs:title'
					>
						Input Frequency:
					</div>
					{NodeInputs}
				</>
			) : null}

			{NodeOutputs?.length ? (
				<>
					{/* Subtitle only required when both inputs and outputs are present */}
					{shouldDisplayInputs ? (
						<div
							className={styles.sectionTitle}
							data-test='tooltip:outputs:title'
						>
							Output Frequency:
						</div>
					) : null}
					{NodeOutputs}
				</>
			) : null}
		</div>
	);

	const renderTooltipBody = () => {
		if (!hoveredNodeInfo.enabled) {
			return <div className={styles.disabled}>Disabled</div>;
		}

		if (hoveredNodeInfo.enabled && nodeError) {
			return ErrorBody;
		}

		return FrequencyInfoDisplay;
	};

	return (
		<CfsTooltip
			id={hoveredNodeInfo.id}
			header={
				<div className={styles.headerContainer}>
					<h4
						className={styles.nodeName}
						data-test='tooltip:header:nodeName'
					>
						{hoveredNodeInfo.name}
					</h4>
					<div
						className={styles.nodeDescription}
						data-test='tooltip:header:nodeDescription'
					>
						{nodeDetails.Description}
					</div>
				</div>
			}
			top={top}
			left={left}
			bottom={bottom}
			classNames={`${
				nodeDetails.Outputs.length >= 1 &&
				hoveredNodeInfo.enabled &&
				!nodeError
					? styles.bodyNoPadding
					: undefined
			} ${styles.root}`}
		>
			{renderTooltipBody()}
		</CfsTooltip>
	);
}

export default NodeTooltip;
