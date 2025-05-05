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
import Tooltip, {Direction} from '../tooltip/Tooltip';
import styles from './TopbarButton.module.scss';

function TopbarButton({
	icon,
	title,
	tooltipType = 'short',
	tooltipDirection = Direction.Right,
	isDisabled = false,
	variant = 'rounded',
	clickHandler
}: {
	readonly icon: React.ReactNode;
	readonly title: string;
	readonly tooltipType?: 'short' | 'long';
	readonly tooltipDirection?: Direction;
	readonly isDisabled?: boolean;
	readonly variant?: 'rounded' | 'square' | 'startingRadius' | 'endingRadius';
	readonly clickHandler?: () => void;
}) {
	return (
		<Tooltip
			title={title}
			type={tooltipType}
			direction={tooltipDirection}
		>
			<button
				type='button'
				className={`${styles.btn} ${isDisabled ? undefined : styles.enabled} ${styles[variant]}`}
				disabled={isDisabled}
				data-test={`top-bar-button:${title}`}
				onClick={clickHandler}
			>
				{icon}
			</button>
		</Tooltip>
	);
}

export default TopbarButton;
