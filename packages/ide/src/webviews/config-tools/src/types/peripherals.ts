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
import type {TFormFieldValue} from 'cfs-react-library';

export type SignalConfig = {
	name: string;
	description?: string;
	projectId: string;
	config: Record<string, string>;
};

export type PeripheralConfig = {
	name: string;
	description?: string;
	projectId?: string; // Should be defined for peripherals with signal groups or no signals.
	signals: Record<string, SignalConfig>;
	config: Record<string, TFormFieldValue>;
	security?: string;
};
