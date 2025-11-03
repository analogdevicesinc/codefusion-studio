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
import {memo, useMemo} from 'react';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import PeripheralBlock from '../peripheral-block/PeripheralBlock';
import PeripheralGroup from '../peripheral-group/peripheral-group';
import {groupPeripherals} from '../../../utils/peripheral';

function PeripheralNavigation({
	peripherals
}: Readonly<{
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>;
}>) {
	const orderedPeripherals = useMemo(() => {
		return groupPeripherals(peripherals);
	}, [peripherals]);

	return (
		<div>
			{orderedPeripherals.map(p => {
				if (p.group) {
					return (
						<div key={`group-${p.group}`}>
							<PeripheralGroup
								group={p.group}
								peripherals={p.peripherals}
							/>
						</div>
					);
				}

				// NOTE peripherals without a group will only have 1 item.
				const peripheral = p.peripherals[0];

				return (
					<PeripheralBlock
						key={`peripheral-${peripheral.name}`}
						{...peripheral}
					/>
				);
			})}
		</div>
	);
}

export default memo(PeripheralNavigation);
