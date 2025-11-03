/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {SocPeripheral} from 'cfs-plugins-api';

let uartPorts: Record<number, SocPeripheral> = {};

export function getUARTPorts() {
	return uartPorts;
}

const uartRegex = /^UART(\d+)$/;

export function initializeProfilingPeripherals(
	peripherals: SocPeripheral[]
) {
	uartPorts = peripherals
		?.filter(p => uartRegex.test(p.Name))
		.reduce<typeof uartPorts>((acc, p) => {
			const portNumber = Number(p.Name.substring(4));
			acc[portNumber] = p;
			return acc;
		}, {});
}
