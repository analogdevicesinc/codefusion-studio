/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {Button, Card, Tooltip} from 'cfs-react-library';
import {useCallback, useEffect, useMemo} from 'react';
import {memo, type ReactNode} from 'react';
import styles from './peripheral-card.module.scss';
import DownArrow from '../../../../../common/icons/DownArrow';
import {useDispatch} from 'react-redux';
import {
	useNewPeripheralAssignment,
	usePeripheralScreenOpenProjectCards
} from '../../../state/slices/app-context/appContext.selector';
import {setPeripheralScreenOpenProjectCards} from '../../../state/slices/app-context/appContext.reducer';
import {updateProjectCardOpenState} from '../../../utils/peripheral';
import {getProjectInfoList} from '../../../utils/config';

type PeripheralCardProps = Readonly<{
	id?: string;
	title: ReactNode;
	end?: ReactNode;
	hasAllocatedPeripherals?: boolean;
	content?: ReactNode;
	dataTest?: string;
	isExpandable?: boolean;
}>;

function PeripheralCard({
	id,
	title,
	end,
	hasAllocatedPeripherals,
	content,
	dataTest
}: PeripheralCardProps) {
	const dispatch = useDispatch();
	const openProjectCards = usePeripheralScreenOpenProjectCards();
	const projects = getProjectInfoList();

	const {projectId: projectWithNewAssignment} =
		useNewPeripheralAssignment() ?? {};

	const isExpanded = useMemo(
		() => Boolean(id) && openProjectCards.includes(id!),
		[id, openProjectCards]
	);

	const projectCardOpenChange = useCallback(
		(projectId: string, open: boolean) => {
			const updatedProjects = updateProjectCardOpenState(
				openProjectCards,
				projectId,
				open
			);
			dispatch(setPeripheralScreenOpenProjectCards(updatedProjects));
		},
		[openProjectCards, dispatch]
	);

	const handleCardEndClick = useCallback(() => {
		if (id) {
			projectCardOpenChange(id, !isExpanded);
		}
	}, [id, isExpanded, projectCardOpenChange]);

	useEffect(() => {
		if (
			projects?.length === 1 &&
			id &&
			!openProjectCards.includes(id)
		) {
			projectCardOpenChange(id, true);
		}

		if (!projectWithNewAssignment || !id) return;

		const shouldBeOpen =
			Boolean(hasAllocatedPeripherals) &&
			projectWithNewAssignment === id;
		const isOpen = openProjectCards.includes(id);

		if (!isOpen && shouldBeOpen) {
			projectCardOpenChange(id, shouldBeOpen);
		}
	}, [
		id,
		hasAllocatedPeripherals,
		projectWithNewAssignment,
		openProjectCards,
		projectCardOpenChange,
		projects
	]);

	return (
		<Card
			disableHoverEffects={!hasAllocatedPeripherals}
			isExpanded={isExpanded}
			id={id}
		>
			<section
				className={styles.peripheralCardContainer}
				id='peripheralCardContainer'
				data-test={dataTest}
				onClick={() => {
					if (
						hasAllocatedPeripherals &&
						Array.isArray(projects) &&
						projects.length > 1
					) {
						handleCardEndClick();
					}
				}}
			>
				<section className={styles.peripheralCardHeader}>
					<div className={styles.title}>{title}</div>
					{end && (
						<div
							className={`${styles.end} ${hasAllocatedPeripherals && Array.isArray(projects) && projects.length > 1 ? styles.expandable : ''}`}
							data-test='allocation-details-chevron'
						>
							{content &&
							Array.isArray(projects) &&
							projects.length > 1 ? (
								<>
									{end}
									<Tooltip
										title={`${isExpanded ? 'Collapse' : 'Expand'}`}
										type='short'
										position='bottom'
									>
										<Button
											className={`${styles.downArrow}${isExpanded ? ` ${styles.iconOpen}` : ''}`}
											appearance='icon'
										>
											<DownArrow />
										</Button>
									</Tooltip>
								</>
							) : (
								end
							)}
						</div>
					)}
				</section>
				{isExpanded && (
					<section
						className={styles.body}
						onClick={e => {
							e.stopPropagation();
						}}
					>
						<div className={styles.content}>{content}</div>
					</section>
				)}
			</section>
		</Card>
	);
}

export default memo(PeripheralCard);
