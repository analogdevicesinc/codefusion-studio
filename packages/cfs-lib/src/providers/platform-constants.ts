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

/**
 * Platform/toolchain identifiers used throughout CFS.
 *
 * These constants are the single source of truth for platform IDs,
 * ensuring consistency across detection, strategies, and consumers.
 */
export const PLATFORM_IDS = {
	/** Maxim SDK (MSDK) / MAX microcontroller platform */
	MSDK: "msdk",

	/** Zephyr RTOS platform */
	ZEPHYR: "zephyr",

	/** Unknown or unsupported platform */
	NONE: "none"
} as const;

/**
 * Type representing any valid platform ID.
 *
 * Use this type instead of string literals for type-safe platform operations.
 */
export type PlatformId =
	(typeof PLATFORM_IDS)[keyof typeof PLATFORM_IDS];
