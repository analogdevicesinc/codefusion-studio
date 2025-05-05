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
import {usePinDetailsTargetPin} from '../../../state/slices/pins/pins.selector';
import PinDetails from '../pin-details/PinDetails';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import PinSearch from '../../pin-search/PinSearch';
import PeripheralNavigation from '../peripheral-navigation-sidebar/PeripheralNavigation';
import {useActivePeripheral} from '../../../state/slices/peripherals/peripherals.selector';
import {useEffect} from 'react';

export default function PinmuxSideContainer() {
	const pinDetailsTargetPin = usePinDetailsTargetPin();

	const searchString = useSearchString('pinconfig');
	const peripheral = useActivePeripheral();

	useEffect(() => {
		if (peripheral) {
			const element = document.querySelector(
				`[data-test="accordion:${peripheral}"]`
			);
			element?.scrollIntoView({
				behavior: 'instant',
				block: 'start'
			});
		}
	}, [peripheral]);

	if (pinDetailsTargetPin) {
		return <PinDetails />;
	}

	if (searchString) {
		return <PinSearch />;
	}

	return <PeripheralNavigation />;
}
