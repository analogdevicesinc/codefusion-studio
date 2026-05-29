/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useCallback, useMemo} from 'react';
import {
	useConfigurationErrors,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';

import {getFormattedCatalog} from '../../utils/get-catalog';
import CfsSearchableGroupSelect from '../../../../common/components/cfs-searchable-group-select/CfsSearchableGroupSelect';
import {type SoCFamily} from '../../common/types/catalog';
import NotificationError from '../../components/notification-error/NotificationError';
import {
	setConfigErrors,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {useAppDispatch} from '../../state/store';
import {configErrors} from '../../common/constants/validation-errors';

const socEngineList: SoCFamily[] = getFormattedCatalog();

export default function SocSelectionContainer() {
	const errors = useConfigurationErrors('soc');

	const selectedSoc = useSelectedSoc();
	const dispatch = useAppDispatch();

	const handleSelectionChange = useCallback(
		(socId: string) => {
			if (socId !== selectedSoc) {
				dispatch(setSelectedSoc(socId));
				dispatch(
					setConfigErrors({
						id: configErrors.soc,
						notifications: []
					})
				);
			}
		},
		[dispatch, selectedSoc]
	);

	const groupedOptions = useMemo(
		() =>
			socEngineList.map(family => ({
				id: family.familyId,
				label: family.familyName,
				options: family.socs.map(soc => ({
					id: soc.id,
					label: soc.name,
					description: soc.description
				}))
			})),
		[]
	);

	return (
		<div>
			<NotificationError
				error={errors}
				testId='soc-selection-error'
			/>

			<CfsSearchableGroupSelect
				selectedOption={selectedSoc}
				setSelectedOption={handleSelectionChange}
				groupedOptions={groupedOptions}
				dataTest='soc-selection'
			/>
		</div>
	);
}
