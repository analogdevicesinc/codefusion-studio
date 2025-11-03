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

import {
	useDfgUI,
	useStreams
} from '../../../state/slices/gaskets/gasket.selector';
import {GasketListView} from './gasket-listview';
import {StreamGroup} from './group-listview';
import styles from './stream-sidebar.module.scss';
import {getGasketModel} from '../../../utils/dfg';

export function StreamSidebar() {
	const gaskets = getGasketModel();
	const {streamView} = useDfgUI();
	const streams = useStreams();

	return (
		<div>
			<div
				className={styles.sidebarHeader}
				data-test='sidebar-header'
			>
				<h4>Streams</h4>
				{streamView === 'Gasket' && <p>IN | OUT</p>}
				{streamView === 'Group' && <p>TOTAL</p>}
			</div>

			{streamView === 'Gasket' &&
				gaskets.map(gasket => (
					<GasketListView key={gasket.Name} gasket={gasket} />
				))}
			{streamView === 'Group' && <StreamGroup streams={streams} />}
		</div>
	);
}
