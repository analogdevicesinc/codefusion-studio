import {useMemo} from 'react';
import {getControlsForProjectIds} from '../utils/api';

/**
 * Generate controls promises for a list of project IDs.
 * @param projectIds Array of project IDs.
 * @returns Array of promises for controls for each project.
 */
export function usePeripheralControlsPerProjects(
	projectIds: string[]
) {
	return useMemo(
		() =>
			projectIds.map(async id =>
				getControlsForProjectIds([id], 'peripheral')
			),
		[projectIds]
	);
}
