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
import DetailsView from '@common/components/details-view/DetailsView';
import {setClockNodeDetailsTargetNode} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	useClockNodeState,
	useClockNodeDetailsTargetNode,
	useDiagramNodeData
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {useAppDispatch} from '../../../state/store';
import ControlDropdown from '../control-dropdown/ControlDropdown';
import ControlToggle from '../control-toggle/ControlToggle';
import styles from './ClockDetails.module.scss';
import ClockControlInput from '../clock-control-input/ClockControlInput';
import {
	SET_INSTRUCTION,
	SELECT_INSTRUCTION
} from '../../../utils/soc-controls';
import {
	generateOutputValueErrorString,
	getCurrentNodeError
} from '../../../utils/node-error';
import {ShortDescErrors} from '../../../types/errorTypes';
import {useEvaluateClockCondition} from '../../../hooks/use-evaluate-clock-condition';
import {memo, useMemo} from 'react';
import {getClockNodeConfig} from '../../../utils/clock-nodes';
import {use} from 'cfs-react-library';
import type {ControlCfg} from '../../../../../common/types/soc';

const toggleControlInTitle = 'ENABLE';

function ClockDetails({
	controlsPromise
}: Readonly<{
	controlsPromise: Promise<Record<string, ControlCfg[]>>;
}>) {
	const clockControls = use(controlsPromise);
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();

	const activeClockNodeDetails = useMemo(
		() => getClockNodeConfig(clockNodeDetailsTargetNode ?? '') ?? {},
		[clockNodeDetailsTargetNode]
	);

	const activeClockNodeState = useClockNodeState(
		clockNodeDetailsTargetNode
	);

	const formattedControls = useMemo(() => {
		if (!clockControls[activeClockNodeDetails.Name]) {
			return {};
		}

		return clockControls[activeClockNodeDetails.Name]?.reduce<
			Record<string, ControlCfg>
		>((acc, control) => {
			// Filter out enum values that do not have configuration steps.
			let enumValues = control.EnumValues;

			if (control.EnumValues) {
				enumValues = control.EnumValues.filter(enumValue =>
					Boolean(
						activeClockNodeDetails.Config?.[control.Id]?.[
							enumValue.Id
						]
					)
				);
				acc[control.Id] = {...control, EnumValues: enumValues};
			} else {
				acc[control.Id] = control;
			}

			return acc;
		}, {});
	}, [clockControls, activeClockNodeDetails]);

	const aggregatedClockNodeConfig = (
		activeClockNodeDetails.ConfigUIOrder || []
	)
		.filter(controlId => formattedControls[controlId])
		.map(controlId => {
			const currentClockControls = formattedControls[controlId];
			const configValues = activeClockNodeDetails.Config?.[controlId];
			const filteredConfigValues: Record<string, unknown> = {};

			// Filter out config values that will not be rendered in the UI.
			if (currentClockControls.EnumValues) {
				currentClockControls.EnumValues.forEach(enumValue => {
					if (configValues?.[enumValue.Id]) {
						filteredConfigValues[enumValue.Id] =
							configValues?.[enumValue.Id];
					}
				});
			}

			return {
				key: controlId,
				type: currentClockControls.Type,
				label: currentClockControls.Description,
				condition: currentClockControls.Condition,
				minVal: currentClockControls.MinimumValue,
				maxVal: currentClockControls.MaximumValue,
				values: filteredConfigValues,
				unit: currentClockControls.Units,
				...(currentClockControls.Default
					? {default: String(currentClockControls.Default)}
					: {}),
				...(currentClockControls.EnumValues
					? {options: currentClockControls.EnumValues}
					: {})
			};
		});

	const handleBackClick = () => {
		dispatch(setClockNodeDetailsTargetNode(undefined));
	};

	const extractPrefix = (clockNodeConfig: string) => {
		const regex = /(.*\d)[^\d_]*(?=_)/;

		const match = regex.exec(clockNodeConfig);

		return match ? match[1] : undefined;
	};

	// This is an assumption, the condition may well be different
	const displayToggleInTitle =
		activeClockNodeDetails?.Type === 'Peripheral' &&
		activeClockNodeDetails.ConfigUIOrder?.includes(
			toggleControlInTitle
		);

	let currentGroupPrefix: string | undefined = extractPrefix(
		aggregatedClockNodeConfig[0]?.key
	);

	const diagramData = useDiagramNodeData(
		clockNodeDetailsTargetNode ?? ''
	);

	const computeEnabledState = useEvaluateClockCondition();

	if (clockNodeDetailsTargetNode === undefined) return null;

	const nodeError = getCurrentNodeError(
		activeClockNodeState,
		computeEnabledState
	);

	const nodeErrorMessage =
		ShortDescErrors[
			nodeError?.[1] ?? ('' as keyof typeof ShortDescErrors)
		];
	const nodeErrorDetails =
		nodeError &&
		generateOutputValueErrorString(nodeError, activeClockNodeState);

	const shouldRenderError =
		diagramData?.enabled &&
		[
			ShortDescErrors.UNCONFIGURED_VALUE,
			ShortDescErrors.LOW_COMPUTED_VALUE,
			ShortDescErrors.HIGH_COMPUTED_VALUE
		].includes(nodeErrorMessage as ShortDescErrors);

	return (
		<DetailsView
			handleBackClick={handleBackClick}
			body={
				<>
					<section className={styles.header}>
						{displayToggleInTitle ? (
							<ControlToggle
								key={clockNodeDetailsTargetNode}
								isInTitle
								controlId={toggleControlInTitle}
								label={clockNodeDetailsTargetNode}
							/>
						) : (
							<h3 data-test={`side-${clockNodeDetailsTargetNode}`}>
								{clockNodeDetailsTargetNode}
							</h3>
						)}
						<label className={styles.label}>
							{activeClockNodeDetails?.Description}
						</label>
					</section>
					<section
						data-test='clock-details:options'
						className={styles.container}
					>
						{aggregatedClockNodeConfig.length
							? aggregatedClockNodeConfig.map(control => {
									let isFirstGroupItem = false;

									if (
										extractPrefix(control.key) !== currentGroupPrefix
									) {
										currentGroupPrefix = extractPrefix(control.key);
										isFirstGroupItem = true;
									}

									const isControlEnabled = control.condition
										? computeEnabledState(
												control.condition,
												activeClockNodeDetails?.Name
											)
										: true;

									if (control.type === 'enum')
										return (
											<ControlDropdown
												key={`dropdown_${clockNodeDetailsTargetNode}_${control.key}`}
												controlCfg={control}
												isDisabled={!isControlEnabled}
												label={
													SELECT_INSTRUCTION + ' ' + control.label
												}
											/>
										);

									if (
										control.type === 'boolean' &&
										!displayToggleInTitle
									)
										return (
											<ControlToggle
												key={`toggle_${clockNodeDetailsTargetNode}_${control.key}`}
												controlId={control.key}
												isDisabled={!isControlEnabled}
												label={control.label}
												isFirstGroupItem={isFirstGroupItem}
											/>
										);

									if (control.key === toggleControlInTitle)
										return null;

									return (
										<div
											key={`input_${clockNodeDetailsTargetNode}_${control.key}`}
											className={styles.clockNodeDetailsTargetNode}
										>
											<ClockControlInput
												controlCfg={control}
												isDisabled={!isControlEnabled}
												label={SET_INSTRUCTION + ' ' + control.label}
											/>
										</div>
									);
								})
							: !activeClockNodeDetails?.Signpost && (
									<label>No configuration options available.</label>
								)}
						{activeClockNodeDetails?.Signpost ? (
							<div className={styles.signPost}>
								{activeClockNodeDetails.Signpost}
							</div>
						) : null}
						{shouldRenderError && (
							<div className={styles.error}>
								<ul className={styles.valueError}>
									<li>{nodeErrorMessage}</li>
								</ul>
								<p>{nodeErrorDetails}</p>
							</div>
						)}
					</section>
				</>
			}
		/>
	);
}

export default memo(ClockDetails);
