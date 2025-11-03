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

import {Button, Card} from 'cfs-react-library';
import {useCallback, useEffect, useMemo} from 'react';
import {memo, type ReactNode} from 'react';
import styles from './peripheral-card.module.scss';
import DownArrow from '../../../../../common/icons/DownArrow';
import {useDispatch} from 'react-redux';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {
	useNewPeripheralAssignment,
	usePeripheralScreenOpenProjectCards
} from '../../../state/slices/app-context/appContext.selector';
import {setPeripheralScreenOpenProjectCards} from '../../../state/slices/app-context/appContext.reducer';
import {updateProjectCardOpenState} from '../../../utils/peripheral';

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
	dataTest,
	isExpandable = true
}: PeripheralCardProps) {
	const dispatch = useDispatch();
	const openProjectCards = usePeripheralScreenOpenProjectCards();

	const {projectId} = useNewPeripheralAssignment() ?? {};

	const isExpanded = useMemo(
		() => !!id && openProjectCards.includes(id),
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

	const handleCardEndClick = () => {
		if (id) {
			projectCardOpenChange(id, !isExpanded);
		}
	};

	useEffect(() => {
		if (!hasAllocatedPeripherals) {
			if (id) {
				projectCardOpenChange(id, false);
			}
		}

		if (projectId === id) {
			if (id) {
				projectCardOpenChange(id, true);
			}
		}
	}, [id, projectId, hasAllocatedPeripherals]);

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
					if (isExpandable) {
						handleCardEndClick();
					}
				}}
			>
				<section className={styles.peripheralCardHeader}>
					<div className={styles.title}>{title}</div>
					{end && (
						<div
							className={`${styles.end} ${isExpandable ? styles.expandable : ''}`}
							data-test='allocation-details-chevron'
						>
							{content ? (
								<>
									{end}
									<Tooltip
										title={`${isExpanded ? 'Collapse' : 'Expand'}`}
										type='long'
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
						onClick={e => e.stopPropagation()}
					>
						<div className={styles.content}>{content}</div>
					</section>
				)}
			</section>
		</Card>
	);
}

export default memo(PeripheralCard);
