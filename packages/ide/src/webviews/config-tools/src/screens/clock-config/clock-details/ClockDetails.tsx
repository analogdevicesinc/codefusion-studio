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
	useClockConfigs,
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
	type GlobalConfig,
	evaluateClockCondition
} from '../../../utils/rpn-expression-resolver';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {getFirmwarePlatform} from '../../../utils/firmware-platform';
import {
	SET_INSTRUCTION,
	SELECT_INSTRUCTION
} from '../../../utils/soc-controls';
import {
	generateOutputValueErrorString,
	getCurrentNodeError
} from '../../../utils/node-error';
import {clockNodeDictionary} from '../../../utils/clock-nodes';
import {ShortDescErrors} from '../../../types/errorTypes';
import {useEvaluateClockCondition} from '../../../hooks/use-evaluate-clock-condition';
import {memo} from 'react';

const toggleControlInTitle = 'ENABLE';

function ClockDetails() {
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode()!;
	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	);
	const clockConfigs = useClockConfigs();

	const firmwarePlatform = getFirmwarePlatform();

	const getControlFirmwarePlatforms = (controlId: string) =>
		clockConfigs.find(config => config.Id === controlId)
			?.FirmwarePlatforms;

	const shouldRenderControl = (controlId: string) =>
		!getControlFirmwarePlatforms(controlId) ||
		!firmwarePlatform ||
		getControlFirmwarePlatforms(controlId)?.some(fw =>
			firmwarePlatform?.toLowerCase().includes(fw.toLowerCase())
		);

	const assignedPins = useAssignedPins();
	const globalConfig: GlobalConfig = {
		clockconfig: {
			[clockNodeDetailsTargetNode]: activeClockNodeDetails ?? {}
		},
		assignedPins,
		currentNode: clockNodeDetailsTargetNode
	};

	const aggregatedClockNodeConfig = Object.values(
		activeClockNodeDetails?.ConfigUIOrder?.map(controlId => {
			const currentClockConfig = clockConfigs.find(
				config => config.Id === controlId
			);

			let configValues: Record<string, any> | undefined =
				activeClockNodeDetails?.Config?.[controlId];
			const firmwarePlatform: string | undefined =
				getFirmwarePlatform();

			if (firmwarePlatform?.toLowerCase().includes('msdk')) {
				configValues =
					activeClockNodeDetails?.ConfigMSDK?.[controlId];
			} else if (firmwarePlatform?.toLowerCase().includes('zephyr')) {
				configValues =
					activeClockNodeDetails?.ConfigZephyr?.[controlId];
			}

			return {
				key: controlId,
				type: currentClockConfig?.Type,
				condition: currentClockConfig?.Condition,
				minVal: currentClockConfig?.MinimumValue,
				maxVal: currentClockConfig?.MaximumValue,
				values: configValues,
				unit: currentClockConfig?.Units
			};
		}) ?? {}
	);

	const getControlLabel = (controlId: string) =>
		clockConfigs.find(control => control.Id === controlId)
			?.Description ?? '';

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

	const diagramData = useDiagramNodeData(clockNodeDetailsTargetNode);

	const nodeDetails = clockNodeDictionary[clockNodeDetailsTargetNode];
	const computeOutputEnabledState = useEvaluateClockCondition();
	const nodeError = getCurrentNodeError(
		activeClockNodeDetails,
		nodeDetails,
		computeOutputEnabledState
	);

	const nodeErrorMessage =
		ShortDescErrors[
			nodeError?.[1] ?? ('' as keyof typeof ShortDescErrors)
		];
	const nodeErrorDetails =
		nodeError &&
		generateOutputValueErrorString(
			nodeError,
			activeClockNodeDetails,
			nodeDetails
		);

	const shouldRenderError =
		diagramData?.enabled &&
		[
			ShortDescErrors.UNCONFIGURED_VALUE,
			ShortDescErrors.LOW_COMPUTED_VALUE,
			ShortDescErrors.HIGH_COMPUTED_VALUE
		].includes(nodeErrorMessage);

	return (
		<DetailsView
			handleBackClick={handleBackClick}
			body={
				<>
					<section className={styles.header}>
						{displayToggleInTitle &&
						shouldRenderControl(toggleControlInTitle) ? (
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
					<section className={styles.container}>
						{aggregatedClockNodeConfig.map(control => {
							if (!shouldRenderControl(control.key)) return null;

							let isFirstGroupItem = false;

							if (extractPrefix(control.key) !== currentGroupPrefix) {
								currentGroupPrefix = extractPrefix(control.key);
								isFirstGroupItem = true;
							}

							const isControlEnabled = control.condition
								? evaluateClockCondition(
										globalConfig,
										control.condition
									)
								: true;

							if (control.type === 'enum')
								return (
									<ControlDropdown
										key={`dropdown_${clockNodeDetailsTargetNode}_${control.key}`}
										controlId={control.key}
										isDisabled={!isControlEnabled}
										label={
											SELECT_INSTRUCTION +
											' ' +
											getControlLabel(control.key)
										}
										values={Object.keys(control.values)}
									/>
								);

							if (control.type === 'boolean' && !displayToggleInTitle)
								return (
									<ControlToggle
										key={`toggle_${clockNodeDetailsTargetNode}_${control.key}`}
										controlId={control.key}
										isDisabled={!isControlEnabled}
										label={getControlLabel(control.key)}
										isFirstGroupItem={isFirstGroupItem}
									/>
								);

							if (control.key === toggleControlInTitle) return null;

							return (
								<div
									key={`input_${clockNodeDetailsTargetNode}_${control.key}`}
									style={{marginBottom: '12px'}}
								>
									<ClockControlInput
										control={control.key}
										controlType={control.type}
										isDisabled={!isControlEnabled}
										label={
											SET_INSTRUCTION +
											' ' +
											getControlLabel(control.key)
										}
										minVal={control.minVal}
										maxVal={control.maxVal}
										unit={control.unit ?? ''}
									/>
								</div>
							);
						})}
						{activeClockNodeDetails?.Signpost && (
							<div className={styles.signPost}>
								{activeClockNodeDetails.Signpost}
							</div>
						)}
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
