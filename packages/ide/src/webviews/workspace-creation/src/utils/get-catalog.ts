import {getCatalog} from './api';
import type {SoC} from 'cfs-ccm-lib';
import {mockedCatalog} from '../common/constants/mocked-catalog';
import formatCatalog from './catalog-formatter';
import type {SoCFamily} from '../common/types/catalog';

// Cache for raw catalog data
let rawCatalog: SoC[];
// Cache for formatted catalog data
let formattedCatalog: SoCFamily[];

if ((window as any).Cypress) {
	// Use mocked data for Cypress or development environment
	rawCatalog = mockedCatalog;
} else {
	rawCatalog = await getCatalog();
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
