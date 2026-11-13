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

import {useMemo} from 'react';

import {useSignalProjectId} from '../state/slices/peripherals/peripherals.selector';
import {
	getIsExternallyManagedProject,
	getPrimaryProjectId
} from '../utils/config';
import {getConfigurablePeripherals} from '../utils/soc-peripherals';
import {usePinHasConfiguration} from './use-pin-has-configuration';

type UseCanConfigureReservedPinParams = Readonly<{
	pinId: string | undefined;
	peripheral: string;
	signal: string;
}>;

export function useCanConfigureReservedPin({
	pinId,
	peripheral,
	signal
}: UseCanConfigureReservedPinParams) {
	const signalProjectId = useSignalProjectId(peripheral, signal);

	const hasConfiguration = usePinHasConfiguration({
		pinId,
		peripheral,
		signal
	});

	const isPeripheralAllocable = useMemo(
		() =>
			getConfigurablePeripherals().some(
				configurablePeripheral =>
					configurablePeripheral.name === peripheral
			),
		[peripheral]
	);

	const projectId =
		signalProjectId ||
		// eslint-disable-next-line no-negated-condition
		(!isPeripheralAllocable ? getPrimaryProjectId() : undefined);

	if (!hasConfiguration || !projectId) {
		return false;
	}

	if (getIsExternallyManagedProject(projectId)) {
		return false;
	}

	if (isPeripheralAllocable && !signalProjectId) {
		return false;
	}

	return true;
}
