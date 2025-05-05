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
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsMainLayout';
import {useAssignedPins} from '../../state/slices/pins/pins.selector';
import PinConfigMainPanel from './main-panel/PinConfigMainPanel';
import PinConfigSide from './side/Side';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';

export default function PinConfig() {
	const assignedPins = useAssignedPins();

	return assignedPins.length === 0 ? (
		<EightColumnLayout
			header='Function Config'
			subtitle='No pins have been assigned to functions.'
			buttonLabel='Back to Pin Mux'
			screenRedirect='pinmux'
		/>
	) : (
		<CfsTwoColumnLayout>
			<div slot='header' />
			<div slot='side-panel'>
				<PinConfigSide />
			</div>

			<PinConfigMainPanel />
		</CfsTwoColumnLayout>
	);
}
