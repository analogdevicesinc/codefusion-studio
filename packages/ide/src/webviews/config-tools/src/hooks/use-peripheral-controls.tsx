import {useMemo} from 'react';
import {getControlsForProjectIds} from '../utils/api';
import type {ControlCfg} from '@common/types/soc';

/**
 * Custom hook to fetch peripheral controls for a given project ID.
 * @param projectId The project ID for which to fetch controls.
 * @returns Promise
 */
export async function usePeripheralControls(
	projectId: string
): Promise<Record<string, ControlCfg[]>> {
	return useMemo(async () => {
		if (!projectId) {
			return Promise.resolve({});
		}

		return getControlsForProjectIds([projectId], 'peripheral');
	}, [projectId]);
}
