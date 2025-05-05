/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
	useActivePeripheral,
	usePeripheralSignalAssignments
} from '../../../state/slices/peripherals/peripherals.selector';
import SignalAssignment from './SignalAssignment';

function ManagePeripheralPinAssignments() {
	const peripheralString =
		useActivePeripheral(Boolean('withCoreInfo')) ?? '';

	const [activePeripheral, coreId] = peripheralString.split(':');

	const assignedSignals = usePeripheralSignalAssignments(
		activePeripheral ?? '',
		coreId
	);

	if (!activePeripheral || !assignedSignals.length) return null;

	return (
		<div
			style={{display: 'flex', flexDirection: 'column', gap: '6px'}}
		>
			{assignedSignals.map(signal => (
				<SignalAssignment
					key={`${activePeripheral}-${signal.name}`}
					signal={signal.name}
					peripheral={activePeripheral}
				/>
			))}
		</div>
	);
}

export default ManagePeripheralPinAssignments;
