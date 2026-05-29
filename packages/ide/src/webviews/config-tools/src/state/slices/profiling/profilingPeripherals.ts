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

import type {SocPeripheral, ZephelinInterface} from 'cfs-types';

const interfaces = new Set<ZephelinInterface>();
let uartPorts: Record<string, SocPeripheral> = {};

export function getInterfaces() {
	return Array.from(interfaces);
}

export function getUARTPorts(): Record<string, SocPeripheral> {
	return uartPorts;
}

export function getMinProfilingMemoryInterval(): number {
	return 50;
}

export function getMaxProfilingMemoryInterval(): number {
	return Infinity;
}

export function getMinCpuLoadInterval(): number {
	return 50;
}

export function getMaxCpuLoadInterval(): number {
	return Infinity;
}

export function getDefaultProfilingInterval(): number {
	return 250;
}

const uartRegex = /^(LP)?UART(\d+)$/;

export function initializeProfilingPeripherals(
	peripherals: SocPeripheral[]
) {
	if (peripherals.some(p => uartRegex.test(p.Name))) {
		interfaces.add('UART');
	}

	if (peripherals.some(p => p.Name === 'USBHS')) {
		interfaces.add('USB');
	}

	uartPorts = peripherals
		.filter(p => uartRegex.test(p.Name))
		.reduce<typeof uartPorts>((acc, p) => {
			acc[p.Name] = p;

			return acc;
		}, {});
}
