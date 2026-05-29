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

import {request} from '../../../common/api';
import {type DebugSessionInfo} from '../types/debug';

export type MemoryDataResponse = {
	sessionId: string;
	address: number;
	data: number[];
};

export async function getMemoryData(
	sessionId: string,
	length: number,
	address?: number
): Promise<MemoryDataResponse> {
	return request('get-memory-data', {
		sessionId,
		length,
		address
	}) as Promise<MemoryDataResponse>;
}

export async function getSessionList(): Promise<DebugSessionInfo[]> {
	return request('get-session-list') as Promise<DebugSessionInfo[]>;
}

export async function getSessionStatus(
	sessionId: string
): Promise<DebugSessionInfo> {
	return request('get-session-status', {
		sessionId
	}) as Promise<DebugSessionInfo>;
}
