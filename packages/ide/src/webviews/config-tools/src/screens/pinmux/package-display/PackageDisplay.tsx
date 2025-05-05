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
import LabelsFrame from './labels-frame/LabelsFrame';
import PinGrid from './pin-grid/PinGrid';
import ZoomableAreaControl from './zoomable-area/ZoomableAreaControl';
import {
	createPinGridDataStructure,
	generateLabelGroups
} from '../utils/package-display';
import {
	useHoveredPin,
	usePinDetailsTargetPin
} from '../../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../../state/store';
import {setPinDetailsTargetPin} from '../../../state/slices/pins/pins.reducer';
import {setActiveSearchString} from '../../../state/slices/app-context/appContext.reducer';
import {useMemo} from 'react';
import PinTooltip from '../../../components/pin-tooltip/PinTooltip';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {getPinCanvas} from '../../../utils/pin-canvas';

function PackageDisplayContainer() {
	const pins = getSocPinDictionary();
	const canvas = getPinCanvas();
	const dispatch = useAppDispatch();
	const pinDetailsTargetPin = usePinDetailsTargetPin();
	const hoveredPinId = useHoveredPin();

	const onContainerClick = (e: React.SyntheticEvent<HTMLElement>) => {
		if (
			(e.target as HTMLElement).id === 'mcu-zoomable-area' ||
			(e.target as HTMLElement).id === 'focused-pin-backdrop'
		) {
			e.stopPropagation();

			if (pinDetailsTargetPin) {
				dispatch(setPinDetailsTargetPin(undefined));
			} else {
				dispatch(
					setActiveSearchString({
						searchContext: 'pinconfig',
						value: ''
					})
				);
			}
		}
	};

	const pinGridDataStructure = useMemo(
		() => createPinGridDataStructure(Object.values(pins), canvas),
		[canvas, pins]
	);

	const labelGroups = useMemo(
		() => generateLabelGroups(canvas),
		[canvas]
	);

	return (
		<div
			id='pinmux-main-panel'
			style={{height: '100%'}}
			onClick={onContainerClick}
		>
			<ZoomableAreaControl>
				<LabelsFrame labelGroups={labelGroups}>
					<PinGrid pinArray={pinGridDataStructure} />
				</LabelsFrame>
			</ZoomableAreaControl>
			{hoveredPinId && <PinTooltip pinId={hoveredPinId} />}
		</div>
	);
}

export default PackageDisplayContainer;
