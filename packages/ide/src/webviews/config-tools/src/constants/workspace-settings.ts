/**
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

import type {TFormControl} from 'cfs-react-library';

/**
 * Defines the sidebar accordion sections and their child items
 * displayed in the CFS Settings navigation panel.
 */
export const SIDEBAR_SECTIONS = [
	{
		key: 'security',
		title: 'Security',
		children: [
			{key: 'mcuboot-config', label: 'MCUboot Settings'},
			{key: 'key-management', label: 'Sign Key Management'}
		]
	}
];

/**
 * Defines the MCUBoot enable/disable options
 * with their labels and values.
 */
export const MCUBOOT_ENABLE_OPTIONS = [
	{label: 'Enabled', value: 'enabled'},
	{label: 'Default', value: 'default'},
	{label: 'Disabled', value: 'disabled'}
] as const;

/**
 * Defines the add key menu options for the sign key management section.
 */
export const ADD_KEY_OPTIONS = [
	{id: 'add-existing-key', label: 'Add Existing Key'},
	{id: 'generate-new-key', label: 'Generate New Key'}
];

/**
 * Defines the form controls for the Generate Key form.
 * These are hardcoded for the time being until plugin side work is done
 */
export const GENERATE_KEY_CONTROLS: TFormControl[] = [
	{
		id: 'keyName',
		name: 'Key Name',
		type: 'string',
		required: true,
		placeholder: 'Start typing...'
	},
	{
		id: 'destinationPath',
		name: 'Destination Path',
		type: 'string',
		required: true,
		placeholder: 'Select destination path...'
	},
	{
		id: 'algorithm',
		name: 'Algorithm',
		type: 'enum',
		required: true,
		default: 'rsa-2048',
		enum: [
			{label: 'rsa-2048', value: 'rsa-2048'},
			{label: 'rsa-3072', value: 'rsa-3072'},
			{label: 'ecdsa-p256', value: 'ecdsa-p256'},
			{label: 'ed25519', value: 'ed25519'}
		],
		placeholder: 'Make a selection'
	},
	{
		id: 'description',
		name: 'Description',
		type: 'string',
		required: false,
		placeholder: 'Start typing...'
	}
];

/**
 * Defines the form controls for the Existing Key form.
 * These are hardcoded for the time being until plugin side work is done
 */
export const EXISTING_KEY_CONTROLS: TFormControl[] = [
	{
		id: 'keyPath',
		name: 'Path to Key',
		type: 'string',
		required: true,
		placeholder: 'Select key file...'
	},
	{
		id: 'description',
		name: 'Description',
		type: 'string',
		required: false,
		placeholder: 'Start typing...'
	}
];
