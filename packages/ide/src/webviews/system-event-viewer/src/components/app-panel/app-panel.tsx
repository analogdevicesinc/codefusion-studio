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

import NavigationPanel from '@common/components/navigation-panel/NavigationPanel';
import {navigationItems} from '../../common/constants/navigation';
import {useActiveScreen} from '../../state/slices/app-context/app-context.selector';

import Timeline from '../../screens/timeline/timeline';
import EventList from '../../screens/event-list/event-list';

export default function SevAppPanel() {
	const activeScreen = useActiveScreen();

	return (
		<NavigationPanel activeNavItem={activeScreen}>
			<Timeline key={navigationItems.timeline} />
			<EventList key={navigationItems.list} />
		</NavigationPanel>
	);
}
