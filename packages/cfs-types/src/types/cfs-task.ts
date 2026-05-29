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
 * Namespace for all task-related type definitions.
 * These types describe the shape of cfs.tasks.json files and resolved task objects.
 */
export namespace Task {
	/**
	 * Describes the shape of a single task entry in a cfs.tasks.json file.
	 */
	export interface Definition {
		label: string;
		type: string;
		command?: string;
		id?: string;
		userFriendlyName?: string;
		args?: unknown;
		options?: {
			env?: Record<string, string>;
			cwd?: string;
			shell?: {
				args?: string[];
				executable?: string;
			};
		};
		windows?: PlatformOverride;
		linux?: PlatformOverride;
		osx?: PlatformOverride;
		group?: string | { kind: string; isDefault: boolean };
		problemMatcher?: string | string[];
		dependsOn?: string | string[];
		[key: string]: unknown;
	}

	/**
	 * Platform-specific overrides for a task definition (windows/linux/osx).
	 */
	export interface PlatformOverride {
		options?: {
			env?: Record<string, string>;
			cwd?: string;
			shell?: {
				args: string[];
				executable?: string;
			};
		};
		command?: string;
	}

	/**
	 * Represents the full shape of a cfs.tasks.json file.
	 */
	export interface File {
		version: string;
		schema?: string;
		type?: string;
		tasks: Definition[];
	}

	/**
	 * A fully resolved task ready for execution.
	 * All template variables have been expanded to concrete values.
	 * Platform-specific overrides have been merged based on the current OS.
	 */
	export interface ResolvedTask {
		label: string;
		command: string;
		cwd: string;
		env: Record<string, string>;
		shellExecutable: string;
		shellArgs: string[];
		group?: string;
		dependsOn?: string[];
		source: "cfs" | "msdk" | "zephyr";
	}
}
