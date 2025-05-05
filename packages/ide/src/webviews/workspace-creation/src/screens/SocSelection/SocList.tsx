/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {memo, useCallback, useMemo} from 'react';
import {Radio} from 'cfs-react-library';
import {useSelectedSoc} from '../../state/slices/workspace-config/workspace-config.selector';
import {useAppDispatch} from '../../state/store';
import {
	setConfigErrors,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import type {SoCFamily} from '../../common/types/catalog';
import CfsSelectionCard from '../../../../common/components/cfs-selection-card/CfsSelectionCard';
import {configErrors} from '../../common/constants/validation-errors';

import styles from './SocList.module.scss';

function SocList({
	searchString,
	socEngineList
}: Readonly<{searchString: string; socEngineList: SoCFamily[]}>) {
	const dispatch = useAppDispatch();
	const selectedSoc = useSelectedSoc();

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

	const filteredSocEngineList = useMemo(
		() =>
			socEngineList.reduce<SoCFamily[]>((acc, socGroup) => {
				const groupSocs = socGroup.socs.filter(soc =>
					soc.name.toLowerCase().includes(searchString.toLowerCase())
				);

				if (groupSocs.length)
					acc.push({...socGroup, socs: groupSocs});

				return acc;
			}, []),
		[searchString, socEngineList]
	);

	function NoSearchResults() {
		return (
			<aside
				className={styles.noSearchResults}
				data-test='no-search-results'
			>
				<h2>No Search Results</h2>
				<p>{`We couldn't find any results for "${searchString}", please change your search query and try again.`}</p>
			</aside>
		);
	}

	return (
		<section className={styles.socGroupsContainer}>
			{filteredSocEngineList.length ? (
				filteredSocEngineList.map(socGroup => (
					<section key={socGroup.familyId}>
						<div className={styles.socGroupTitle}>
							<h2>{socGroup.familyName}</h2>
							<span className={styles.tag}>
								{socGroup.socs.length}
							</span>
						</div>
						<div className={styles.socGroupContainer}>
							{socGroup.socs.map(soc => (
								<CfsSelectionCard
									key={soc.id}
									testId={`socSelection:card:${soc.id}`}
									id={soc.id}
									isChecked={selectedSoc === soc.id}
									onChange={handleSelectionChange}
								>
									<Radio
										slot='start'
										checked={selectedSoc === soc.id}
									/>
									<div slot='title'>
										<h3 className={styles.socTitle}>{soc.name}</h3>
										<p className={styles.socDesc}>
											{soc.description}
										</p>
									</div>
								</CfsSelectionCard>
							))}
						</div>
					</section>
				))
			) : (
				<NoSearchResults />
			)}
		</section>
	);
}

export default memo(SocList);
