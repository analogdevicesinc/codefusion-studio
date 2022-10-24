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
import type {
	ControlCfg,
	ControlDictionary,
	Controls,
	Soc
} from '@common/types/soc';
import {getSocControls} from './api';

export const SET_INSTRUCTION = 'Set';
export const SELECT_INSTRUCTION = 'Select';

export let socControls: Controls;
const socControlsDictionary: Record<
	'PinConfig' | 'ClockConfig',
	ControlDictionary
> = {
	PinConfig: {},
	ClockConfig: {}
};

if (
	import.meta.env.MODE === 'development' ||
	((window as any).__webview_public_path__ as string)?.includes(
		'elf-explorer'
	)
) {
	// Allow overriding the soc controls in test mode
	if (
		(window as any).Cypress &&
		window.localStorage.getItem('test_controls')
	) {
		socControls = JSON.parse(
			window.localStorage.getItem('test_controls')!
		);
	} else {
		socControls = (window as any).__DEV_SOC__?.Controls ?? {};
	}
} else {
	socControls = await getSocControls();
}

export function getSocControlGroup(
	type: 'PinConfig' | 'ClockConfig'
) {
	return socControls[type];
}

export function getSocControlsDictionary(
	type: 'PinConfig' | 'ClockConfig'
): ControlDictionary {
	if (Object.keys(socControlsDictionary[type]).length)
		return socControlsDictionary[type];

	const controls: Controls = (window as any).__DEV_SOC__?.Controls
		? (window as any).__DEV_SOC__?.Controls
		: socControls;

	socControlsDictionary[type] = controls[type]?.reduce(
		(obj, control) => ({
			...obj,
			[control.Id]: control
		}),
		{}
	);

	Object.freeze(socControlsDictionary[type]);

	return socControlsDictionary[type];
}

export function getCachedSocControls(
	type: 'PinConfig' | 'ClockConfig'
) {
	if (socControls?.[type]) {
		return socControls?.[type];
	}

	if ((window as any).__DEV_SOC__) {
		return ((window as any).__DEV_SOC__ as Soc).Controls[type];
	}

	console.error('SOC controls not found');

	return [] as ControlCfg[];
}
