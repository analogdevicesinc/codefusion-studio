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
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../state/store';
import styles from './SignalPinPair.module.scss';

type SignalPinPairProps = {
	readonly peripheral: string;
	readonly pairArray: Array<{
		assignedSignal: string;
		assignedPinId: string;
	}>;
};

export default function SignalPinPair({
	peripheral,
	pairArray
}: SignalPinPairProps) {
	const dispatch = useAppDispatch();

	const handleSignalSelection = (
		signalName: string,
		pinId: string
	) => {
		dispatch(
			setActiveConfiguredSignal({
				peripheralName: peripheral,
				signalName,
				pinId
			})
		);
	};

	const {signal: activeSignal, pin: activePin} =
		useActiveConfiguredSignal();

	return (
		<section className={styles.container}>
			<p className={styles['peripheral-title']}>{peripheral}</p>
			{pairArray.map(pair => (
				<div
					key={`${pair.assignedSignal}-${pair.assignedPinId}`}
					className={`${styles['signal-pin-pair']} ${activeSignal === pair.assignedSignal && activePin === pair.assignedPinId ? styles.active : ''}`}
					onClick={() => {
						handleSignalSelection(
							pair.assignedSignal,
							pair.assignedPinId
						);
					}}
				>
					<div>{pair.assignedSignal}</div>
					<div>{pair.assignedPinId}</div>
				</div>
			))}
		</section>
	);
}
