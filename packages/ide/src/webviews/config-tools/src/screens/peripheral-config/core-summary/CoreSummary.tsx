/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {Modal} from '@common/components/modal/Modal';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import HelpBanner from '../../../components/help-banner/HelpBanner';
import CoreSummaryEntry from './CoreSummaryEntry';
import styles from './CoreSummary.module.scss';
import {
	useActiveScreen,
	useCoreFilters,
	usePeripheralScreenOpenProjectCards
} from '../../../state/slices/app-context/appContext.selector';
import {
	getIsPeripheralBanner,
	updateIsPeripheralBanner
} from '../../../utils/api';
import {useDispatch} from 'react-redux';
import {getProjectInfoList} from '../../../utils/config';
import {
	Button,
	CollapseAllIcon,
	ExpandAllIcon
} from 'cfs-react-library';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {setPeripheralScreenOpenProjectCards} from '../../../state/slices/app-context/appContext.reducer';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';

function CoreSummary() {
	const filteredCoreName = useCoreFilters()[0];
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.peripherals;
	const projects = getProjectInfoList();
	const dispatch = useDispatch();
	const [isHelpBannerDisplayed, setIsHelpBannerDisplayed] = useState<
		boolean | undefined
	>();
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);
	const peripheralAllocations = usePeripheralAllocations();
	const projectsWithPeripherals = useMemo(
		() =>
			Object.keys(peripheralAllocations).filter(
				project => Object.keys(peripheralAllocations[project]).length
			),
		[peripheralAllocations]
	);
	const openProjectCards = usePeripheralScreenOpenProjectCards();

	const id = useActiveScreen();

	useEffect(() => {
		getIsPeripheralBanner()
			.then((resp: boolean) => {
				setIsHelpBannerDisplayed(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	const filteredProjectsByCoreName = useMemo(
		() =>
			projects?.filter(project =>
				filteredCoreName ? project.Name === filteredCoreName : project
			),
		[filteredCoreName, projects]
	);

	const handleHelpBanner = useCallback(async () => {
		setIsHelpBannerDisplayed(false);
		await updateIsPeripheralBanner(false);
	}, []);

	return (
		<div className={styles.scrollableContainer}>
			<HelpBanner
				isHelpBannerDisplayed={Boolean(isHelpBannerDisplayed)}
				header='Getting Started with Peripheral Allocation'
				description='Select a peripheral or function from the list to allocate it to a core.'
				onDiscard={async () => handleHelpBanner()}
				onContinue={async () => handleHelpBanner()}
				onHelp={() => {
					setIsHelpModalOpen(prev => !prev);
				}}
			/>
			<div className={styles.sectionContainer}>
				<div className={styles.coreSectionHeader}>
					<h1>Core Projects</h1>
					<div className={styles.headerIcons}>
						<Tooltip
							title={l10n?.['expand-action']?.tooltips?.expand}
							type='long'
						>
							<Button
								appearance='icon'
								disabled={
									projectsWithPeripherals.length ===
									openProjectCards.length
								}
								className={styles.icon}
								onClick={() => {
									dispatch(
										setPeripheralScreenOpenProjectCards(
											projectsWithPeripherals
										)
									);
								}}
							>
								<ExpandAllIcon />
							</Button>
						</Tooltip>

						<Tooltip
							title={l10n?.['expand-action']?.tooltips?.collapse}
							type='long'
						>
							<Button
								appearance='icon'
								disabled={openProjectCards.length === 0}
								className={styles.icon}
								onClick={() => {
									dispatch(setPeripheralScreenOpenProjectCards([]));
								}}
							>
								<CollapseAllIcon />
							</Button>
						</Tooltip>
					</div>
				</div>
				<div
					className={styles.coreSection}
					data-test='cores-summary-container'
				>
					{filteredProjectsByCoreName?.map(project => (
						<CoreSummaryEntry key={project.Name} project={project} />
					))}
				</div>
			</div>

			<Modal
				isOpen={isHelpModalOpen}
				handleModalClose={() => {
					setIsHelpModalOpen(prev => !prev);
				}}
			>
				<h1>
					{/* eslint-disable-next-line new-cap */}
					{LocalizedMessage({id: `${id}.help.title`})}
				</h1>
				<LocalizedMessage parseHtml id={`${id}.description`} />
			</Modal>
		</div>
	);
}

export default memo(CoreSummary);
