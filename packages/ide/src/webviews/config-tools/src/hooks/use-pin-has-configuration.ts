/*
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {useEffect, useState} from 'react';

import {CONTROL_SCOPES} from '../constants/scopes';
import {useSignalProjectId} from '../state/slices/peripherals/peripherals.selector';
import {getControlsForProjectIds} from '../utils/api';
import {getPrimaryProjectId} from '../utils/config';
import {getSocPinDetails} from '../utils/soc-pins';
import {getApplicablePinConfigControls} from '../screens/pinmux/pin-config-sidebar/pinconfig-display/pin-config-controls';

type UsePinHasConfigurationParams = Readonly<{
	pinId: string | undefined;
	peripheral: string;
	signal: string;
}>;

export function usePinHasConfiguration({
	pinId,
	peripheral,
	signal
}: UsePinHasConfigurationParams) {
	const signalProjectId = useSignalProjectId(peripheral, signal);
	const [hasConfiguration, setHasConfiguration] = useState(false);

	useEffect(() => {
		let isCancelled = false;

		const checkConfiguration = async () => {
			if (!pinId) {
				setHasConfiguration(false);

				return;
			}

			const signalPinConfig = getSocPinDetails(pinId)?.Signals?.find(
				pinSignal =>
					pinSignal.Peripheral === peripheral &&
					pinSignal.Name === signal
			)?.PinConfig;

			if (!signalPinConfig) {
				setHasConfiguration(false);

				return;
			}

			/*
			 * The primary project is used only to determine whether the
			 * reserved pin exposes applicable configuration controls.
			 */
			const projectId = signalProjectId || getPrimaryProjectId();

			if (!projectId) {
				setHasConfiguration(false);

				return;
			}

			const controls = await getControlsForProjectIds(
				[projectId],
				CONTROL_SCOPES.PIN_CONFIG
			);

			if (isCancelled) return;

			const applicableControls = getApplicablePinConfigControls(
				controls.PinConfig ?? [],
				signalPinConfig,
				undefined,
				signal
			);

			setHasConfiguration(
				applicableControls.some(({control}) => !control.PluginOption)
			);
		};

		void checkConfiguration();

		return () => {
			isCancelled = true;
		};
	}, [peripheral, pinId, signal, signalProjectId]);

	return hasConfiguration;
}
