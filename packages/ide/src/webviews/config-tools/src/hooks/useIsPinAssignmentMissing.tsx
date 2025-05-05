/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import useIsPinAssignmentRequired from './useIsPinAssignmentRequired';
import {useAssignedPin} from '../state/slices/pins/pins.selector';

function useIsPinAssignmentMissing(
	signal: string,
	peripheral: string
) {
	const isRequired = useIsPinAssignmentRequired(signal, peripheral);
	const assignedPin = useAssignedPin({peripheral, signal});

	return isRequired && !assignedPin;
}

export default useIsPinAssignmentMissing;
