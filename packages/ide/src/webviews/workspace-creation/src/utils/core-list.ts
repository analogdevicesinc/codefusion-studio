import {getFormattedCatalog} from './get-catalog';
import type {
	CatalogCoreInfo,
	SoCFamily
} from '../common/types/catalog';

// Core dictionary maps SoC IDs to a record of core IDs and their info
let coreDictionary: Record<
	string,
	Record<string, CatalogCoreInfo>
> = {};

/**
 * Builds the core dictionary from the formatted catalog data
 *
 * @param formattedCatalog - The formatted catalog data
 * @returns A dictionary mapping SoC IDs to their cores
 */
function buildCoreDictionary(
	formattedCatalog: SoCFamily[]
): Record<string, Record<string, CatalogCoreInfo>> {
	return formattedCatalog.reduce<
		Record<string, Record<string, CatalogCoreInfo>>
	>((acc, socFamily) => {
		socFamily.socs.forEach(soc => {
			const socCores: Record<string, CatalogCoreInfo> = {};

			soc.cores.forEach(core => {
				socCores[core.id] = core;
			});

			acc[soc.id] = socCores;
		});

		return acc;
	}, {});
}

/**
 * Retrieves the core dictionary, which is a nested record structure
 * mapping SoC group IDs to their respective cores.
 *
 * If the dictionary is empty, it will attempt to initialize it.
 *
 * @returns {Record<string, Record<string, CatalogCoreInfo>>} The core dictionary.
 */
export function getCoreDictionary() {
	// If dictionary is empty and not already initializing, try to initialize it
	if (!Object.keys(coreDictionary).length) {
		const catalog = getFormattedCatalog();

		coreDictionary = buildCoreDictionary(catalog);
	}

	return coreDictionary;
}

/**
 * Retrieves the list of cores for a given SoC ID.
 *
 * @param socId - The ID of the System on Chip (SoC) for which to retrieve the core list.
 * @returns An array of cores associated with the provided SoC ID. If the SoC ID is not found,
 *          an empty array is returned.
 */
export function getCoreList(socId: string) {
	const dict = getCoreDictionary();

	return dict[socId] ?? [];
}

/**
 * Retrieves the core information from the catalog based on the given SoC ID and core ID.
 *
 * @param socId - The ID of the System on Chip (SoC).
 * @param coreId - The ID of the core within the SoC.
 * @returns The core information corresponding to the provided SoC ID and core ID.
 */
export function getCatalogCoreInfo(
	socId: string,
	coreId: string | undefined
) {
	if (!socId || !coreId) return undefined;

	const dict = getCoreDictionary();

	return dict[socId]?.[coreId];
}
