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
import {memo} from 'react';
import styles from './PeripheralSignalGroup.module.scss';
import PeripheralSignal, {
	type PeripheralSignalProps
} from '../peripheral-signal/PeripheralSignal';

function PeripheralSignalGroup({
	name,
	peripheral,
	isSelected,
	signals,
	isSignalAssigned,
	projects,
	allocatedCoreId,
	onClick
}: PeripheralSignalProps) {
	return (
		<div className={styles.container}>
			<PeripheralSignal
				name={name}
				peripheral={peripheral}
				isSignalAssigned={isSignalAssigned}
				projects={projects}
				signals={signals}
				isSelected={isSelected}
				allocatedCoreId={allocatedCoreId}
				onClick={onClick}
			/>
		</div>
	);
}

export default memo(PeripheralSignalGroup);
