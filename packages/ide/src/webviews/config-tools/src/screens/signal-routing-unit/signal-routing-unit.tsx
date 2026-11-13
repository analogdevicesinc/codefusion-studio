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
import {useEffect} from 'react';
import {navigationItems} from '@common/constants/navigation';
import type {NavigationItem} from '@common/types/navigation';
import {
	setActiveScreenSubscreen,
	setActiveScreenSubscreens
} from '../../state/slices/app-context/appContext.reducer';
import {useActiveScreenSubscreen} from '../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../state/store';
import {Connections} from './connections/connections';
import {Routing} from './routing/routing';
import styles from './signal-routing-unit.module.scss';

/**
 * Signal Routing Unit configuration screen.
 *
 * Registers its Connections and Routing subscreens (switched from the config
 * tools top bar) and renders the active one. Both subscreens are placeholder
 * scaffolds while the feature is built out.
 */
export function SignalRoutingUnit({
	initialActiveScreenSubscreen
}: {
	readonly initialActiveScreenSubscreen?: NavigationItem;
}) {
	const dispatch = useAppDispatch();
	const activeScreenSubscreen = useActiveScreenSubscreen();

	useEffect(() => {
		dispatch(
			setActiveScreenSubscreens([
				navigationItems.signalRoutingUnitConnections,
				navigationItems.signalRoutingUnitRouting
			])
		);
		dispatch(
			setActiveScreenSubscreen(
				initialActiveScreenSubscreen ??
					navigationItems.signalRoutingUnitConnections
			)
		);
	}, [dispatch, initialActiveScreenSubscreen]);

	return (
		<div
			data-test='signal-routing-unit'
			className={styles.signalRoutingUnit}
		>
			{activeScreenSubscreen ===
			navigationItems.signalRoutingUnitRouting ? (
				<Routing />
			) : (
				<Connections />
			)}
		</div>
	);
}
