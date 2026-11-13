/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {useMemo} from 'react';
import {getControlsForProjectIds} from '../utils/api';
import type {ControlCfg} from '@common/types/soc';

/**
 * Custom hook to fetch peripheral controls for a given project ID.
 * @param projectId The project ID for which to fetch controls.
 * @returns Promise
 */
export function usePeripheralControls(
	projectId: string
): Promise<Record<string, ControlCfg[]>> {
	return useMemo(() => {
		if (!projectId) {
			return Promise.resolve({});
		}

		return getControlsForProjectIds([projectId], 'peripheral');
	}, [projectId]);
}
