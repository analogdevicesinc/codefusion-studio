/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

/**
 * Constants for control scopes used throughout the application
 * These are used when retrieving controls from cache or fetching them from plugins
 */
export const CONTROL_SCOPES = {
	PIN_CONFIG: 'pinConfig',
	CLOCK_CONFIG: 'clockConfig',
	PERIPHERAL: 'peripheral',
	MEMORY: 'memory',
	DFG: 'dfg'
} as const;

/**
 * Union type of all control scope values
 */
export type ControlScope =
	(typeof CONTROL_SCOPES)[keyof typeof CONTROL_SCOPES];
