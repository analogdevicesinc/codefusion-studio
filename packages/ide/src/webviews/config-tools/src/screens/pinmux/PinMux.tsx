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
import TwoColumnLayout from '../../components/main-layout/MainLayout';
import PinmuxHeader from './header/PinmuxHeader';
import PinmuxSide from './side/Side';
import PackageDisplay from './package-display/PackageDisplay';
import {useEffect, useState} from 'react';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';

function PinMUX() {
	const [innerWidth, setInnerWidth] = useState(window.innerWidth);
	const [innerHeight, setInnerHeight] = useState(window.innerHeight);

	useEffect(() => {
		const handleResize = () => {
			setInnerWidth(window.innerWidth);
			setInnerHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return innerWidth < 900 || innerHeight < 475 ? (
		<EightColumnLayout
			header='Pin Mux'
			subtitle='This feature is not currently supported for windows this size. If possible please increase the size of this window.'
		/>
	) : (
		<TwoColumnLayout
			header={<PinmuxHeader />}
			sidePanel={<PinmuxSide />}
			mainPanel={<PackageDisplay />}
			sidePanelId='peripheral-navigation'
		/>
	);
}

export default PinMUX;
