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

import {useCallback, useState} from 'react';
import {SearchInput} from 'cfs-react-library';
import SocList from './SocList';
import NotificationError from '../../components/notification-error/NotificationError';
import {useConfigurationErrors} from '../../state/slices/workspace-config/workspace-config.selector';

import styles from './SocSelectionContainer.module.scss';
import {getFormattedCatalog} from '../../utils/get-catalog';

const socEngineList = getFormattedCatalog();

let catalogItemsCount = 0;

for (const group of socEngineList) {
	catalogItemsCount += group.socs.length;
}

export default function SocSelectionContainer() {
	const [search, setSearch] = useState<string>('');
	const errors = useConfigurationErrors('soc');

	const handleSearchChange = useCallback((newInput: string) => {
		setSearch(newInput);
	}, []);

	return (
		<div
			data-test='soc-selection:container'
			className={styles.socSelectionContainer}
		>
			<div className={styles.searchBox}>
				<SearchInput
					inputVal={search}
					placeholder='Search SoCs'
					rightAdornment={
						<span
							className={styles.rightAdornment}
						>{`${catalogItemsCount.toLocaleString('en-US')} available`}</span>
					}
					onClear={() => {
						setSearch('');
					}}
					onInputChange={handleSearchChange}
				/>
			</div>

			<NotificationError
				error={errors}
				testId='soc-selection-error'
			/>

			<SocList searchString={search} socEngineList={socEngineList} />
		</div>
	);
}
