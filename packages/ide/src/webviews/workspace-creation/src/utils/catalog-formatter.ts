/**
 * Utilitary to format the SoC catalog data received from the API.
 * @param catalogRawData
 * @returns formatted catalog data to be used in worskpace creation
 */

import type {
	SoCFamily,
	CatalogCoreInfo,
	TStandardBoard,
	TCustomBoard
} from '../common/types/catalog';
import type {Board, CorePart, Package, SoC} from 'cfs-ccm-lib';

export default function formatCatalog(
	catalogRawData: SoC[]
): SoCFamily[] {
	return catalogRawData.reduce((acc: SoCFamily[], rawSoC: SoC) => {
		let family = acc.find(
			(soc: SoCFamily) => soc?.familyId === rawSoC?.family?.id
		);

		if (!family) {
			family = {
				familyId: rawSoC?.family?.id,
				familyName: rawSoC?.family?.name,
				socs: []
			};
			acc.push(family);
		}

		family.socs.push({
			id: rawSoC?.name,
			name: rawSoC?.name,
			description: rawSoC?.description ?? '',
			templates: [], // Multicore templates are fetched from Plugin Manager
			board: {
				standard:
					formatStandardBoards(
						rawSoC?.boards ?? [],
						rawSoC?.packages ?? []
					) || [],
				custom: formatCustomBoards(rawSoC?.packages ?? []) || []
			},
			cores: formatCores(rawSoC.cores) || []
		});

		return acc;
	}, []);
}

const formatCores = (cores: CorePart[]): CatalogCoreInfo[] =>
	cores.map((core: CorePart) => ({
		id: core?.id,
		dataModelCoreID: core?.dataModelCoreID ?? '',
		name: core?.name,
		coreType: core?.coreType,
		plugins: [],
		isPrimary: Object.prototype.hasOwnProperty.call(core, 'primary')
			? core.primary
			: undefined
	}));

const formatStandardBoards = (
	rawBoards: Board[],
	rawPackages: Package[]
): TStandardBoard[] =>
	rawBoards.map((board: Board) => ({
		// The combination between a SoC - board and SoC - package is unique. There cannot be 2 identical boards or 2 identical packages for a SoC.
		// So, it is correct and safe to use the boardName as boardId and packageName as packageId
		boardId: board?.name ?? '',
		packageId:
			rawPackages.find(pack => pack.id === board?.packageIDs[0])
				?.name ?? '',
		name: board?.name ?? '',
		description: board?.description ?? '',
		packageLayout:
			rawPackages.find(pack => pack.id === board?.packageIDs[0])
				?.packageType ?? '',
		url: board.productUrl ?? ''
	}));

const formatCustomBoards = (rawPackages: Package[]): TCustomBoard[] =>
	rawPackages.map((pack: Package) => ({
		boardId: '',
		// It is allowed to use the name as id for a package because each package in the packages list, for a given SoC, is unique.
		// there cannot be the same package for a SoC. So, the SoC (id) - package (name) combination is unique
		packageId: pack?.name ?? '',
		name: pack?.name ?? '',
		description: pack?.description ?? '',
		packageLayout: pack.name
	}));
