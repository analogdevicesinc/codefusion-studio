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
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import styles from './PinconfigDisplay.module.scss';
import ControlDropdown from '../control-dropdown/ControlDropdown';
import {
	useAppliedSignalCfg,
	usePinConfig,
	usePinDetails
} from '../../../state/slices/pins/pins.selector';
import {useDispatch} from 'react-redux';
import {setAppliedSignalControlValue} from '../../../state/slices/pins/pins.reducer';
import PinconfigControlInput from '../pinconfig-control-input/PinconfigControlInput';
import {getFirmwarePlatform} from '../../../utils/firmware-platform';

export default function PinconfigDisplay() {
	const {
		peripheral: activePeripheral,
		signal: activeSignal,
		pin: activePin
	} = useActiveConfiguredSignal();

	const dispatch = useDispatch();

	const pinConfig = usePinConfig();

	const {PinCfg: userSelections, ControlResetValues: resetValues} =
		useAppliedSignalCfg(activePin, activeSignal) ?? {};

	const signalPinCfg = usePinDetails(activePin)?.Signals?.find(
		signal =>
			signal.Name === activeSignal &&
			signal.Peripheral === activePeripheral
	)?.PinConfig;

	const pinConfigFieldsArray = signalPinCfg
		? Object.entries(signalPinCfg)
		: [];

	const didDefaultValuesChange = Object.entries(
		userSelections ?? {}
	).some(
		([appliedSignalCfgKey, appliedSignalCfgVal]) =>
			appliedSignalCfgVal !== resetValues?.[appliedSignalCfgKey]
	);

	const firmwarePlatform = getFirmwarePlatform();

	const getControlType = (controlId: string) =>
		pinConfig.find(config => config.Id === controlId)?.Type ?? '';

	const getControlFirmwarePlatforms = (controlId: string) =>
		pinConfig.find(config => config.Id === controlId)
			?.FirmwarePlatforms;

	const isInput = (controlId: string) =>
		['integer', 'text', 'identifier'].includes(
			getControlType(controlId)
		);

	const shouldRenderControl = (controlId: string) =>
		!getControlFirmwarePlatforms(controlId) ||
		!firmwarePlatform ||
		getControlFirmwarePlatforms(controlId)?.some(fw =>
			firmwarePlatform?.toLowerCase().includes(fw.toLowerCase())
		);

	const handleReset = () => {
		const controlData = Object.entries(resetValues ?? []).map(
			([resetValueKey, resetValue]) => ({
				Peripheral: activePeripheral,
				Name: activeSignal,
				pinId: activePin,
				control: resetValueKey,
				controlValue: resetValue
			})
		);

		dispatch(setAppliedSignalControlValue({controls: controlData}));
	};

	return (
		<section className={styles.controlContainer}>
			<div className={styles.title}>
				<div className={styles.header}>{activeSignal}</div>
				<div className={styles.header}>{activePin}</div>
				<div className={styles.divider} />
				<h3
					className={styles.reset}
					data-test='reset-to-default'
					onClick={handleReset}
				>
					Reset to default
				</h3>
			</div>
			{pinConfigFieldsArray.map(([controlId, controlData]) => {
				if (shouldRenderControl(controlId)) {
					if (isInput(controlId)) {
						return (
							<PinconfigControlInput
								key={`${activeSignal}-${activePin}-${controlId}`}
								control={controlId}
								controlType={getControlType(controlId)}
							/>
						);
					}

					return (
						<ControlDropdown
							key={`${activeSignal}-${activePin}-${controlId}`}
							controlId={controlId}
							controlData={controlData}
							isDefaultValue={
								Boolean(userSelections?.[controlId]) &&
								userSelections?.[controlId] ===
									resetValues?.[controlId]
							}
						/>
					);
				}

				return null;
			})}
			{didDefaultValuesChange && (
				<div className={styles.info} data-test='package-display-info'>
					<p>&lowast;</p>
					<p>Non-default value</p>
				</div>
			)}
		</section>
	);
}
