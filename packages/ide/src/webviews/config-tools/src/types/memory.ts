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

export type PartitionFormErrors = {
	displayName: string;
	type: string;
	cores: string;
	blocks: string;
	startAddress: string;
	size: string;
};

export type ByteUnit = 'bytes' | 'KB' | 'MB';

export const ByteUnitMap = {
	bytes: 1,
	KB: 1024,
	MB: 1024 * 1024
} as const;
