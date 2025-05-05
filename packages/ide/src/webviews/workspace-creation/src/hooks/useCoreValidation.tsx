import {useCallback} from 'react';
import {ERROR_TYPES} from '../common/constants/validation-errors';
import type {StateProject} from '../common/types/state';
import {useConfigurationErrors} from '../state/slices/workspace-config/workspace-config.selector';

// Rules:
// - the primary core should be enabled & configured
// - enabled cores should be configured
const isCoreInErrorState = (
	selectedCores: Record<string, StateProject>
): string[] => {
	const errorTypes = new Set<string>();
	const cores = Object.values(selectedCores);

	let isPrimaryCoreConfigured = false;
	let hasUnconfiguredEnabledCore = false;

	for (const core of cores) {
		const isConfigured = Boolean(core.pluginId && core.pluginVersion);

		if (core.isPrimary && core.isEnabled && isConfigured) {
			isPrimaryCoreConfigured = true;

			continue;
		}

		// Check for enabled cores that are not configured
		if (core.isEnabled && !isConfigured) {
			hasUnconfiguredEnabledCore = true;
			break;
		}
	}

	if (!isPrimaryCoreConfigured) {
		errorTypes.add(ERROR_TYPES.noPrimaryCore);
	}

	if (hasUnconfiguredEnabledCore) {
		errorTypes.add(ERROR_TYPES.unconfiguredCore);
	}

	// Return array of errors (empty if no errors)
	return Array.from(errorTypes);
};

export default function useCoreValidation() {
	const coresErrors = useConfigurationErrors('cores');

	const isCoreCardErrorState = useCallback(
		(coreState: StateProject): boolean => {
			if (!coreState) return false;
			let isError = false;

			if (
				coreState?.isEnabled &&
				!Object.keys(coreState?.platformConfig).length &&
				coresErrors.notifications.includes(
					ERROR_TYPES.unconfiguredCore
				)
			) {
				isError = true;
			}

			return isError;
		},
		[coresErrors.notifications]
	);

	return {
		isCoreInErrorState,
		isCoreCardErrorState
	};
}
