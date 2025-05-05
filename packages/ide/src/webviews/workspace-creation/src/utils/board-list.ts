import {getFormattedCatalog} from './get-catalog';
import type {
	CatalogBoardInfo,
	SoCFamily
} from '../common/types/catalog';

// Cache for boards by SoC ID
const boardsDict: Record<string, CatalogBoardInfo> = {};
const defaultBoard: CatalogBoardInfo = {standard: [], custom: []};

/**
 * Builds the boards cache from formatted catalog data
 *
 * @param formattedCatalog - The formatted catalog data
 * @returns A record mapping SoC IDs to their board information
 */
function getBoardsDictionary(
	formattedCatalog: SoCFamily[]
): Record<string, CatalogBoardInfo> {
	const cache: Record<string, CatalogBoardInfo> = {};

	formattedCatalog.forEach(socFamily => {
		socFamily.socs.forEach(soc => {
			if (soc.id && soc.board) {
				cache[soc.id] = soc.board;
			}
		});
	});

	return cache;
}

/**
 * Initializes the boards cache if it's empty
 *
 * @returns The boards cache
 */
function getCachedBoardsDictionary(): Record<
	string,
	CatalogBoardInfo
> {
	if (Object.keys(boardsDict).length === 0) {
		const formattedCatalog = getFormattedCatalog();

		if (formattedCatalog) {
			const boards = getBoardsDictionary(formattedCatalog);
			Object.assign(boardsDict, boards);
		}
	}

	return boardsDict;
}

/**
 * Gets the board list for a specific SoC ID
 *
 * @param selectedSocId - The ID of the SoC to get boards for
 * @returns The board information for the selected SoC, or a default empty board if not found
 */
export function getBoardList(selectedSocId: string) {
	// Initialize the cache if needed
	const boardsDict = getCachedBoardsDictionary();

	return boardsDict[selectedSocId] ?? defaultBoard;
}
