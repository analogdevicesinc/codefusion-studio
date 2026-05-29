/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Button, PlusIcon} from 'cfs-react-library';

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {useApplicationPackages} from '../../../state/slices/application-packages/applicationPackages.selector';

import MCUBootSidebarListItem from './mcuboot-sidebar-list/mcuboot-sidebar-list-item';
import EmptyMCUBootSidebar from './empty-mcuboot-sidebar/empty-mcuboot-sidebar';
import styles from './mcuboot-config-sidebar.module.scss';
import {useAddApplicationPackage} from '../../../hooks/use-application-package-actions';

function MCUBootConfigSidebar() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage;
	const applicationPackages = useApplicationPackages();
	const handleAddPackage = useAddApplicationPackage();

	const addBtnRef = useRef<HTMLDivElement>(null);
	const [tooltipVisible, setTooltipVisible] = useState(false);
	const [tooltipCoords, setTooltipCoords] = useState({
		top: 0,
		left: 0
	});
	const tooltipTimeoutRef = useRef<
		ReturnType<typeof setTimeout> | undefined
	>(undefined);

	const handleAddBtnMouseEnter = useCallback(() => {
		tooltipTimeoutRef.current = setTimeout(() => {
			if (addBtnRef.current) {
				const rect = addBtnRef.current.getBoundingClientRect();
				setTooltipCoords({
					top: rect.bottom + 6,
					left: rect.left + rect.width / 2
				});
				setTooltipVisible(true);
			}
		}, 400);
	}, []);

	const handleAddBtnMouseLeave = useCallback(() => {
		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
			tooltipTimeoutRef.current = undefined;
		}

		setTooltipVisible(false);
	}, []);

	useEffect(
		() => () => {
			if (tooltipTimeoutRef.current) {
				clearTimeout(tooltipTimeoutRef.current);
			}
		},
		[]
	);

	return (
		<div
			className={styles.sidebar}
			data-test='mcuboot-config:sidebar'
		>
			<div className={styles.sidebarHeader}>
				<div className={styles.title}>{l10n?.title}</div>
				<div
					ref={addBtnRef}
					onMouseEnter={handleAddBtnMouseEnter}
					onMouseLeave={handleAddBtnMouseLeave}
				>
					<Button
						appearance='icon'
						dataTest='mcuboot-config:sidebar:add-app-pack'
						onClick={handleAddPackage}
					>
						<PlusIcon />
					</Button>
					{tooltipVisible &&
						createPortal(
							<span
								className={styles.fixedTooltip}
								style={{
									top: tooltipCoords.top,
									left: tooltipCoords.left
								}}
							>
								Add App Pack
							</span>,
							document.body
						)}
				</div>
			</div>
			{applicationPackages.length === 0 ? (
				<EmptyMCUBootSidebar />
			) : (
				<div className={styles.listContainer}>
					<div>
						{applicationPackages.map(pkg => (
							<MCUBootSidebarListItem
								key={pkg.id}
								applicationPackage={pkg}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default MCUBootConfigSidebar;
