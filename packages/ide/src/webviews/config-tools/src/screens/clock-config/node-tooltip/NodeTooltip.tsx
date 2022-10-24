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
import {clockNodeDictionary} from '../../../utils/clock-nodes';
import {getFormattedClockFrequency} from '../utils/format-schematic-data';
import {clockFrequencyDictionary} from '../../../utils/rpn-expression-resolver';
import {gap} from '../constants/tooltip';
import type {DiagramNode} from '@common/types/soc';
import {extractClockPrefix} from '../utils/clock-nodes';
import {useClockNodeState} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {ShortDescErrors} from '../../../types/errorTypes';
import CfsNotification from '@common/components/cfs-notification/CfsNotification';

import styles from './NodeTooltip.module.scss';
import {useEvaluateClockCondition} from '../../../hooks/use-evaluate-clock-condition';
import {
	generateOutputValueErrorString,
	getCurrentNodeError
} from '../../../utils/node-error';

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
			{clockName && <p className={styles.name}>{clockName}</p>}
			{value}
		</div>
	);
}

function NodeTooltip({
	hoveredNodeInfo,
	containerRef
}: PositionedNodeTooltipProps) {
	const hoveredNode = document.getElementById(hoveredNodeInfo.id);
	const nodeDetails = clockNodeDictionary[hoveredNodeInfo.name];
	const nodeState = useClockNodeState(hoveredNodeInfo.name);
	const computeOutputEnabledState = useEvaluateClockCondition();
	const nodeError = getCurrentNodeError(
		nodeState,
		nodeDetails,
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
		height: nodeHeight = 0,
		bottom: nodeBottom = 0
	} = hoveredNode?.getBoundingClientRect() ?? {};

	let top: number | undefined =
		nodeTop - containerTop + nodeHeight + gap;
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

	const NodeOutputs = nodeDetails?.Outputs.map(output => {
		let isFirstGroupItem = false;

		const frequency = getFormattedClockFrequency(
			clockFrequencyDictionary[output.Name]
		);

		const errorString =
			nodeError &&
			generateOutputValueErrorString(
				nodeError,
				nodeState,
				nodeDetails
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
				value={errorString ?? frequency}
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
				<li
					className={styles.errorItem}
					data-test='tooltip:body:error-value'
				>
					{generateOutputValueErrorString(
						nodeError,
						nodeState,
						nodeDetails
					)}
				</li>
			</ul>
		</>
	);

	const FrequencyInfoDisplay = (
		<div className={styles.body}>
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

			{NodeOutputs?.length && (
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
			)}
		</div>
	);

	const renderTooltipBody = () => {
		if (!hoveredNodeInfo.enabled) {
			return 'Disabled';
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
						{clockNodeDictionary[hoveredNodeInfo.name].Description}
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
