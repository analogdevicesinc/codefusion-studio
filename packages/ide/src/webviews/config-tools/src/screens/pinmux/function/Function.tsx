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
import {type MouseEventHandler, useState, memo} from 'react';
import styles from './Function.module.scss';
import {
	VSCodeButton,
	// @ts-expect-error Import Needed to register web component.
	// eslint-disable-next-line unused-imports/no-unused-imports
	VSCodeDropdown,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react';
import {
	removeAppliedSignal,
	setAppliedSignal,
	setIsPinFocused
} from '../../../state/slices/pins/pins.reducer';
import {useAppDispatch} from '../../../state/store';
import Config from '@common/icons/Config';
import type {Pin} from '@common/types/soc';
import {
	usePinAppliedSignals,
	usePinDetails
} from '../../../state/slices/pins/pins.selector';
import ConflictIcon from '@common/icons/Conflict';
import {useCurrentTarget} from '../../../state/slices/peripherals/peripherals.selector';
import {setCurrentTarget} from '../../../state/slices/peripherals/peripherals.reducer';
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {
	useActiveConfiguredSignal,
	useRegisters
} from '../../../state/slices/app-context/appContext.selector';
import {Modal} from '@common/components/modal/Modal';
import PinconfigDisplay from '../../pin-config/pinconfig-display/PinconfigDisplay';
import CheckmarkIcon from '@common/icons/Checkmark';
import Toggle from '@common/components/toggle/Toggle';

type FunctionProps = {
	readonly peripheralGroup: string;
	readonly name: string;
	readonly pins: Pin[];
	readonly isLastIndex?: boolean;
};

function Function({
	peripheralGroup,
	name,
	pins,
	isLastIndex = false
}: FunctionProps) {
	const dispatch = useAppDispatch();

	const registers = useRegisters();

	const {signal: activeConfiguredSignal, pin: activeConfiguredPin} =
		useActiveConfiguredSignal();

	const currentTargetForSignal =
		useCurrentTarget(peripheralGroup, name) ?? pins[0].Name;

	const targetPinId =
		pins.length === 1 ? pins[0].Name : currentTargetForSignal;

	const [isConfiguringFunction, setIsConfiguringFunction] =
		useState<boolean>(false);

	const signalsForTargetPin = usePinAppliedSignals(targetPinId) ?? [];

	const assignedPin = signalsForTargetPin.find(
		signal =>
			signal.Pin === (targetPinId ?? pins[0].Name) &&
			signal.Peripheral === peripheralGroup
	);

	const coprogrammedSignals = usePinDetails(
		targetPinId
	)?.Signals?.find(
		signal => signal.Name === name
	)?.coprogrammedSignals;

	const isToggledOn = Boolean(assignedPin);

	const shouldRenderConflict =
		signalsForTargetPin.length > 1 && isToggledOn;

	const handleModalClose = () => {
		setIsConfiguringFunction(false);
	};

	const handleModalOpen = () => {
		setIsConfiguringFunction(true);
		dispatch(
			setActiveConfiguredSignal({
				peripheralName: peripheralGroup,
				signalName: name,
				pinId: targetPinId
			})
		);
	};

	const handleToggle = () => {
		const payload = {
			Pin: targetPinId,
			Peripheral: peripheralGroup,
			Name: name
		};

		if (isToggledOn) {
			dispatch(removeAppliedSignal(payload));

			if (
				activeConfiguredPin === targetPinId &&
				activeConfiguredSignal === name
			) {
				dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
			}

			if (coprogrammedSignals?.length) {
				coprogrammedSignals.forEach(coprogrammedSignal => {
					const payload = {
						Pin: coprogrammedSignal.Pin,
						Peripheral: coprogrammedSignal.Peripheral,
						Name: coprogrammedSignal.Signal
					};

					dispatch(removeAppliedSignal(payload));

					if (
						activeConfiguredPin === payload.Pin &&
						activeConfiguredSignal === payload.Name
					) {
						dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
					}
				});
			}
		} else {
			dispatch(setAppliedSignal({...payload, registers}));

			if (targetPinId !== currentTargetForSignal) {
				dispatch(
					removeAppliedSignal({
						...payload,
						Pin: currentTargetForSignal
					})
				);

				dispatch(
					setCurrentTarget({
						peripheralGroup,
						signalName: name,
						dropdownVal: targetPinId
					})
				);
			}

			if (coprogrammedSignals?.length) {
				coprogrammedSignals.forEach(coprogrammedSignal => {
					const payload = {
						Pin: coprogrammedSignal.Pin,
						Peripheral: coprogrammedSignal.Peripheral,
						Name: coprogrammedSignal.Signal
					};

					dispatch(setAppliedSignal({...payload, registers}));
				});
			}
		}
	};

	const handleDropdown: MouseEventHandler<HTMLOptionElement> = e => {
		const {value} = e.currentTarget;

		const payload = {
			Pin: value,
			Peripheral: peripheralGroup,
			Name: name
		};

		dispatch(
			setCurrentTarget({
				peripheralGroup,
				signalName: name,
				dropdownVal: value
			})
		);

		if (isToggledOn) {
			dispatch(removeAppliedSignal({...payload, Pin: targetPinId}));

			if (
				activeConfiguredPin === targetPinId &&
				activeConfiguredSignal === name
			) {
				dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
			}

			dispatch(setAppliedSignal({...payload, registers}));
		}

		dispatch(setIsPinFocused({id: targetPinId, isFocused: false}));
	};

	return (
		<>
			<section
				key={name}
				className={styles.container}
				data-test={`${peripheralGroup}-${name}`}
			>
				{shouldRenderConflict && (
					<div
						id={`signal-${name}-conflict`}
						className={styles.conflictIcon}
					>
						<ConflictIcon />
					</div>
				)}
				<div>{name}</div>
				<div className={styles.divider} />
				{pins.length === 1 ? (
					<div>{pins[0].Name}</div>
				) : (
					// @ts-expect-error: Due to an open bug in the React wrapper, we need to use the plain web component instead.
					// See: https://github.com/microsoft/vscode-webview-ui-toolkit/issues/406
					<vscode-dropdown
						position={isLastIndex ? 'above' : 'below'}
						value={targetPinId}
						class={styles.dropDownPin}
					>
						{pins.map(pin => (
							<VSCodeOption
								key={pin.Name}
								selected={pin.Name === targetPinId}
								className={styles.dropdownPinOption}
								value={pin.Name}
								onClick={handleDropdown}
							>
								<div className={styles.dropdownPinLabel}>
									{pin.Name}
									<div className={styles.checkmarkIcon}>
										{pin.Name === targetPinId && <CheckmarkIcon />}
									</div>
								</div>
							</VSCodeOption>
						))}
						{/* @ts-expect-error: See previous above. */}
					</vscode-dropdown>
				)}
				<Toggle
					isToggledOn={isToggledOn}
					handleToggle={handleToggle}
					icon={<Config width='12.5' height='10.8' />}
					handleModalOpen={handleModalOpen}
				/>
			</section>
			{isConfiguringFunction && (
				<Modal
					isOpen={isConfiguringFunction}
					isDynamicHeight={false}
					handleModalClose={handleModalClose}
					footer={
						<VSCodeButton
							appearance='secondary'
							onClick={handleModalClose}
						>
							Close
						</VSCodeButton>
					}
				>
					<>
						<div style={{marginBottom: '40px'}}>
							<h1>Configuration</h1>
							<p>Change or reset the configuration values</p>
						</div>
						<PinconfigDisplay />
					</>
				</Modal>
			)}
		</>
	);
}

export default memo(Function);
