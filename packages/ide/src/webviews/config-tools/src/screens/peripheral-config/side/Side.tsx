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
import {useState, useMemo, useEffect, useRef} from 'react';
import PeripheralGroupsFilterControls, {
	type FilterOption
} from '../peripheral-groups-filter-controls/FilterControls';
import PeripheralNavigation from '../peripheral-navigation/PeripheralNavigation';
import {
	getConfigurablePeripherals,
	filterAvailablePeripherals,
	filterAllocatedPeripherals
} from '../../../utils/soc-peripherals';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import styles from './Side.module.scss';
import {useIsAllocatingProject} from '../../../state/slices/app-context/appContext.selector';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {useAppDispatch} from '../../../state/store';
import {setIsAllocatingCore} from '../../../state/slices/app-context/appContext.reducer';

const defaultFilterOptions: Record<string, FilterOption> =
	Object.freeze({
		all: {isSelected: true},
		allocated: {},
		available: {}
	});

export default function PheripheralConfigSideContainer() {
	const dispatch = useAppDispatch();

	const configurablePeripheralList: Array<
		FormattedPeripheral<FormattedPeripheralSignal>
	> = getConfigurablePeripherals();

	const peripheralAllocations = usePeripheralAllocations();

	const availablePeripheralList = useMemo(
		() =>
			filterAvailablePeripherals(
				configurablePeripheralList,
				peripheralAllocations
			),
		[configurablePeripheralList, peripheralAllocations]
	);

	// @NOTE we can't just substract configurablePeripheralList and availablePeripheralList
	// as some pheripherals have signals that can be individually assigned - peripheral
	// will be present in both available and allocated list.
	const allocatedPerihperalList = useMemo(
		() =>
			filterAllocatedPeripherals(
				configurablePeripheralList,
				peripheralAllocations
			),
		[configurablePeripheralList, peripheralAllocations]
	);

	const [filterOptions, setFilterOptions] = useState<
		Record<string, FilterOption>
	>(defaultFilterOptions);

	const filteredPeripherals = useMemo(() => {
		if (filterOptions.available.isSelected) {
			return availablePeripheralList;
		}

		if (filterOptions.allocated.isSelected) {
			return allocatedPerihperalList;
		}

		return configurablePeripheralList;
	}, [
		filterOptions,
		configurablePeripheralList,
		availablePeripheralList,
		allocatedPerihperalList
	]);

	const sidebarRef = useRef<HTMLDivElement>(null);
	const backdropRef = useRef<HTMLDivElement>(null);
	const [hasScrollbar, setHasScrollbar] = useState(false);

	const checkScrollbar = () => {
		if (sidebarRef.current) {
			setHasScrollbar(
				sidebarRef.current.scrollHeight >
					sidebarRef.current.clientHeight
			);
		}
	};

	useEffect(() => {
		checkScrollbar();
		// We need to track resize window events as the scrollbar might show/hide
		window.addEventListener('resize', checkScrollbar);
	}, [filteredPeripherals]);

	// Only scroll within the sidebar bounds
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			if (backdropRef.current) {
				if (backdropRef.current.contains(event.target as Node)) {
					if (sidebarRef.current) {
						sidebarRef.current.scrollTop += event.deltaY;
					}

					event.preventDefault();
				}
			}
		};

		document.addEventListener('wheel', handleWheel, {
			passive: false
		});

		return () => {
			document.removeEventListener('wheel', handleWheel);
		};
	}, []);

	const onFilterSelectionChange = (filter: string) => {
		if (filterOptions[filter]?.isSelected) {
			// If the same filter is clicked again, reset to default
			setFilterOptions(defaultFilterOptions);

			return;
		}

		const updatedFilters: Record<string, FilterOption> =
			Object.fromEntries(
				Object.entries(filterOptions).map(([key, option]) => [
					key,
					{
						...option,
						isSelected: key === filter
					}
				])
			);
		setFilterOptions(updatedFilters);
	};

	const shouldMountBackdrop = useIsAllocatingProject();

	return (
		<div className={styles.peripheralSidebarContainer}>
			<div className={styles.sidebarWrapper}>
				<PeripheralGroupsFilterControls
					options={filterOptions}
					onSelect={onFilterSelectionChange}
				/>

				<div ref={sidebarRef} className={styles.listWrapper}>
					<PeripheralNavigation peripherals={filteredPeripherals} />
				</div>

				{shouldMountBackdrop && (
					<div
						ref={backdropRef}
						id='peripheral-sidebar-backdrop'
						className={styles.peripheralSidebarBackdrop}
						style={{
							// Account for scrollbar width as it needs to stay accessible
							width: hasScrollbar ? 'calc(100% - 8px)' : '100%'
						}}
						onClick={() => {
							// Cancel allocation if user clicks on the backdrop
							dispatch(setIsAllocatingCore(false));
						}}
					/>
				)}
			</div>
		</div>
	);
}
