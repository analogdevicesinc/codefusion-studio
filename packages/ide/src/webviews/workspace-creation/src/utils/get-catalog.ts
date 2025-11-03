import {getCatalog} from './api';
import {isCypressEnvironment} from '../../../common/utils/env';
import type {SoC} from 'cfs-ccm-lib';
import {mockedCatalog} from '../common/constants/mocked-catalog';
import formatCatalog from './catalog-formatter';
import type {SoCFamily} from '../common/types/catalog';

// Cache for raw catalog data
let rawCatalog: SoC[] = [];
// Cache for formatted catalog data
let formattedCatalog: SoCFamily[] | undefined = undefined;

if (isCypressEnvironment()) {
	// Use mocked data for Cypress or development environment
	rawCatalog = mockedCatalog;
} else {
	try {
		// Attempt to fetch the catalog data
		rawCatalog = await getCatalog();
	} catch (error) {
		console.error('Error fetching catalog:', error);
	}
}

/**
 * Gets the formatted catalog data, initializing it based on environment
 *
 * @returns Promise resolving to the formatted catalog data
 */
export function getFormattedCatalog(): SoCFamily[] {
	if (!formattedCatalog) {
		formattedCatalog = formatCatalog(rawCatalog);
	}

	return formattedCatalog;
}
