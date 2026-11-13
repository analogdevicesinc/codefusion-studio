/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {
	useActivePeripheral,
	usePeripheralSignalAssignments
} from '../../../state/slices/peripherals/peripherals.selector';
import {getFixedFunctionPins} from '../../../utils/soc-pins';
import SignalAssignment from './SignalAssignment';

function ManagePeripheralPinAssignments() {
	const peripheralString =
		useActivePeripheral(Boolean('withCoreInfo')) ?? '';
	const [activePeripheral, coreId] = peripheralString.split(':');
	const assignedSignals = usePeripheralSignalAssignments(
		activePeripheral ?? '',
		coreId
	);

	const reservedSignals = activePeripheral
		? getFixedFunctionPins().flatMap(
				pin =>
					pin.Signals?.filter(
						signal => signal.Peripheral === activePeripheral
					).map(signal => signal.Name) ?? []
			)
		: [];

	const signals = activePeripheral
		? [
				...new Set([
					...assignedSignals.map(signal => signal.name),
					...reservedSignals
				])
			]
		: [];

	if (!activePeripheral || !signals.length) return null;

	return (
		<div
			style={{display: 'flex', flexDirection: 'column', gap: '6px'}}
		>
			{signals.map(signal => (
				<SignalAssignment
					key={`${activePeripheral}-${signal}`}
					signal={signal}
					peripheral={activePeripheral}
				/>
			))}
		</div>
	);
}

export default ManagePeripheralPinAssignments;
