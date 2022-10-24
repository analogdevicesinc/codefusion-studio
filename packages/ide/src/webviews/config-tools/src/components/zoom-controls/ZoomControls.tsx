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
import {type ReactNode} from 'react';
import ZoomControl from '../zoom-control/ZoomControl';
import styles from './zoomControls.module.scss';

function ZoomControls({
	controls
}: {
	readonly controls: Array<[string, ReactNode, () => void]>;
}) {
	return (
		<div id='zoom-controls' className={styles.zoomControls}>
			{controls.map(([id, icon, cb]) => (
				<ZoomControl key={id} id={id} icon={icon} onClick={cb} />
			))}
		</div>
	);
}

export default ZoomControls;
