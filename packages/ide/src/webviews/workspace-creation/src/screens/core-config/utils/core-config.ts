import type {StatePlatformConfig} from '../../../common/types/state';

export const coreConfigReducerActions = {
	setFormData: 'setFormData'
} as const;

type CoreConfigAction = {
	type: typeof coreConfigReducerActions.setFormData;
	payload: StatePlatformConfig;
};

export function coreConfigReducer(
	state: StatePlatformConfig,
	action: CoreConfigAction
) {
	switch (action.type) {
		case coreConfigReducerActions.setFormData:
			return {
				...state,
				...action.payload
			};

		default:
			return state;
	}
}

/**
 * Get the board name for the MSDK based on the provided board and SoC.
 * @param board
 * @param soc
 * @returns The board name for the MSDK.
 */
export const getMsdkBoardName = (
	board: string,
	soc: string
): string => {
	switch (board.toLowerCase()) {
		case 'evkit_v1':
			return 'EvKit_V1';

		case 'fthr':
			if (soc === 'MAX32690') {
				return 'FTHR';
			}

			if (soc === 'MAX78000') {
				return 'FTHR_RevA';
			}

			if (soc === 'MAX32650') {
				return 'FTHR_APPS_A';
			}

			return 'FTHR_Apps_P1';
		case 'ad-apard32690-sl':
		case 'apard':
			return 'APARD';
		case 'ad-swiot1l-sl':
			return 'AD-SWIOT1L-SL';
		case 'evsys':
			return 'EVSYS';
		default:
			return '';
	}
};

/**
 * Get the board name for Zephyr based on the provided board and SoC.
 * @param board
 * @param soc
 * @returns The board name for Zephyr.
 */
export const getZephyrBoardName = (
	board: string,
	soc: string
): string => {
	switch (board.toLowerCase()) {
		case 'ad-apard32690-sl':
			return 'apard32690/max32690/m4';
		case 'evkit_v1':
			if (soc.toLowerCase() === 'max32675c') {
				return 'max32675evkit/max32675';
			}

			return `${soc.toLowerCase()}evkit/${soc.toLowerCase()}${
				soc.toLowerCase() === 'max32666'
					? '/cpu0'
					: ['max78000', 'max78002', 'max32690', 'max32655'].includes(
								soc.toLowerCase()
						  )
						? '/m4'
						: ''
			}`;
		case 'evsys':
			return `${soc.toLowerCase()}evsys`;
		case 'fthr':
		case 'fthr_reva':
			return `${soc.toLowerCase()}fthr/${soc.toLowerCase()}${soc.toLowerCase() === 'max32666' ? '/cpu0' : ['max32657', 'max32672', 'max32650'].includes(soc.toLowerCase()) ? '' : '/m4'}`;
		case 'fthr_apps_p1':
			return `${soc.toLowerCase()}fthr_apps/${soc.toLowerCase()}${soc.toLowerCase() === 'max32657' ? '' : '/m4'}`;
		case 'ad-swiot1l-sl':
			return 'ad_swiot1l_sl';
		default:
			return '';
	}
};
