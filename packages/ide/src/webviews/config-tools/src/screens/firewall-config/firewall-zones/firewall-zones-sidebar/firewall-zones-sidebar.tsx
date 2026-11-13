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

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import {createPortal} from 'react-dom';
import {
	Badge,
	Button,
	ConflictIcon,
	EmptyState,
	PlusIcon,
	SearchInput
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {
	useFirewallZones,
	useActiveZoneId,
	useConflictingZoneIds,
	useFirewallZoneSearchQuery
} from '../../../../state/slices/firewall/firewall.selector';
import {
	setActiveZoneId,
	setFirewallZoneSearchQuery
} from '../../../../state/slices/firewall/firewall.reducer';
import {useAppDispatch} from '../../../../state/store';
import {useAddFirewallZone} from '../../../../hooks/use-firewall-zone-actions';
import {
	FIREWALL_ZONE_ACCESS_MODE_BADGE_APPEARANCE,
	FIREWALL_ZONE_ACCESS_MODE_LABELS,
	getFirewallZoneDescription
} from '../constants';
import {
	createHighlightForElements,
	createSearchPattern,
	isHighlightsAPISupported
} from '../../../../../../common/utils/highlightApi';
import styles from './firewall-zones-sidebar.module.scss';

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

function FirewallZonesSidebar() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones;

	const dispatch = useAppDispatch();
	const firewallZones = useFirewallZones();
	const activeZoneId = useActiveZoneId();
	const conflictingZoneIds = useConflictingZoneIds();
	const handleAddZone = useAddFirewallZone();

	const conflictLabel: string =
		(l10n?.conflictLabel as string) ?? 'Has conflicts';

	const searchQuery: string = useFirewallZoneSearchQuery();

	const searchPattern: RegExp = useMemo(
		() => createSearchPattern(searchQuery),
		[searchQuery]
	);

	const filteredZones = useMemo(
		() =>
			firewallZones
				.filter(zone => searchPattern.test(zone.name))
				.sort((a, b) => collator.compare(a.name, b.name)),
		[firewallZones, searchPattern]
	);

	const listContainerRef = useRef<HTMLDivElement>(null);
	const highlightGroup = 'firewall-zone-search-highlight';

	useLayoutEffect(() => {
		if (!isHighlightsAPISupported()) {
			return;
		}

		CSS.highlights.delete(highlightGroup);

		if (listContainerRef.current && searchQuery.trim()) {
			const highlightableElements =
				listContainerRef.current.getElementsByClassName(
					styles.highlightable as string
				);
			const highlight = createHighlightForElements(
				highlightableElements,
				searchPattern
			);
			CSS.highlights.set(highlightGroup, highlight);
		}

		return () => {
			CSS.highlights.delete(highlightGroup);
		};
	}, [searchQuery, searchPattern, filteredZones, highlightGroup]);

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
			data-test='firewall-zones:sidebar'
		>
			<div className={styles.sidebarHeaderContainer}>
				<div className={styles.sidebarHeader}>
					<div className={styles.title}>{l10n?.title}</div>
					<Badge
						appearance='secondary'
						dataTest='firewall-zones:sidebar:count'
					>
						{firewallZones.length}
					</Badge>
					<div
						ref={addBtnRef}
						className={styles.addButton}
						onMouseEnter={handleAddBtnMouseEnter}
						onMouseLeave={handleAddBtnMouseLeave}
					>
						<Button
							appearance='icon'
							dataTest='firewall-zones:sidebar:add-zone'
							onClick={handleAddZone}
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
									{l10n?.tooltip?.addZone}
								</span>,
								document.body
							)}
					</div>
				</div>
				{firewallZones.length > 0 && (
					<div className={styles.searchContainer}>
						<SearchInput
							inputVal={searchQuery}
							placeholder={l10n?.search?.placeholder}
							dataTest='firewall-zones:sidebar:search'
							onInputChange={value => {
								dispatch(setFirewallZoneSearchQuery(value));
							}}
							onClear={() => {
								dispatch(setFirewallZoneSearchQuery(''));
							}}
						/>
					</div>
				)}
			</div>
			{firewallZones.length === 0 ? (
				<div
					className={styles.emptySidebarContainer}
					data-test='firewall-zones:empty-sidebar'
				>
					<EmptyState
						title={l10n?.['empty-sidebar']?.title}
						type='info'
						description={l10n?.['empty-sidebar']?.description}
						hasBorder={false}
					/>
				</div>
			) : filteredZones.length === 0 ? (
				<div
					className={styles.emptySidebarContainer}
					data-test='firewall-zones:no-search-results'
				>
					<EmptyState
						title={l10n?.search?.['no-results']?.title}
						type='info'
						hasBorder={false}
					/>
				</div>
			) : (
				<div ref={listContainerRef} className={styles.listContainer}>
					{filteredZones.map(zone => (
						<div
							key={zone.id}
							className={`${styles.listDetails} ${
								zone.id === activeZoneId ? styles.active : ''
							}`}
							role='button'
							tabIndex={0}
							data-test={`firewall-zones:sidebar:zone:${zone.id}`}
							onClick={() => {
								dispatch(setActiveZoneId(zone.id));
							}}
							onKeyDown={event => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									dispatch(setActiveZoneId(zone.id));
								}
							}}
						>
							<div className={styles.listItemContent}>
								<div className={styles.listItemHeader}>
									<div
										className={`${styles.listItemName} ${styles.highlightable}`}
									>
										{zone.name}
									</div>
									<Badge
										className={styles.accessModeBadge}
										appearance={
											FIREWALL_ZONE_ACCESS_MODE_BADGE_APPEARANCE[
												zone.accessMode
											]
										}
										dataTest={`firewall-zones:sidebar:zone:${zone.id}:access-mode`}
									>
										{
											FIREWALL_ZONE_ACCESS_MODE_LABELS[
												zone.accessMode
											]
										}
									</Badge>
								</div>
								<div className={styles.listItemDescription}>
									{getFirewallZoneDescription(zone)}
								</div>
							</div>
							{conflictingZoneIds.includes(zone.id) ? (
								<span className={styles.conflictIcon}>
									<ConflictIcon
										width={16}
										height={16}
										dataTest={`firewall-zones:sidebar:zone:${zone.id}:conflict`}
									/>
									<span className={styles.visuallyHidden}>
										{conflictLabel}
									</span>
								</span>
							) : null}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default FirewallZonesSidebar;
