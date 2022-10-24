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
import type {TContextMenuOption} from '../types/generic';

export const CONTEXT_MENU_SYMOLS_OPTIONS: TContextMenuOption[] = [
	{
		id: 0,
		label: '',
		show: true
	},
	{
		id: 1,
		label: 'Go to symbol source code',
		show: false
	},
	{
		id: 2,
		label: 'Help - ',
		show: false
	},
	{
		id: 3,
		label: 'Show column as',
		show: false
	}
];
