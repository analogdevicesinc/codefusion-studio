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

export type DebugSessionInfo = {
	isActive?: boolean;
	isRunning: boolean;
	name: string;
	isLive: boolean;
	sessionId: string;
};

export type SymbolsDataResponse = {
	id: number;
	name: string;
	demangled: string | undefined;
	type: string;
	address: number;
	section: string | undefined;
	size: number;
	localstack: number | undefined;
	stack: number | undefined;
	bind: string;
	visibility: string;
	recursive: number | undefined;
	path: string;
	stackdepth: number | undefined;
};
