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
import styles from './Toggle.module.scss';

type ToggleProps = {
	readonly isToggledOn: boolean;
	readonly handleToggle: () => void;
	readonly isDisabled?: boolean;
	readonly dataTest?: string;
};

export default function Toggle({
	isToggledOn,
	handleToggle,
	isDisabled,
	dataTest
}: ToggleProps) {
	return (
		<label
			className={styles.switch}
			tabIndex={0}
			onKeyUp={e => {
				if (e.key === 'Enter' || e.key === ' ') handleToggle();
			}}
		>
			<input
				checked={isToggledOn}
				type='checkbox'
				onChange={handleToggle}
			/>
			<span
				data-test={`${dataTest}-span`}
				data-checked={isToggledOn}
				className={`${styles.slider} ${styles.round} ${isToggledOn ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
			/>
		</label>
	);
}
