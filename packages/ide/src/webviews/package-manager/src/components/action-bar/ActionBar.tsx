/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {Button} from 'cfs-react-library';
import styles from './action-bar.module.scss';

export type ActionBarAction = {
	label: string;
	onClick: () => void;
	disabled?: boolean;
};

export type ActionBarProps = {
	/** Left-aligned, secondary-appearance action (e.g. Back, Cancel, Ignore). */
	readonly secondaryAction?: ActionBarAction;
	/** Right-aligned, primary-appearance action (e.g. Continue, Install, Confirm). */
	readonly primaryAction?: ActionBarAction;
};

export default function ActionBar({
	secondaryAction,
	primaryAction
}: ActionBarProps) {
	return (
		<div className={styles.container}>
			<div className={styles.actionContainer}>
				{secondaryAction ? (
					<Button
						appearance='secondary'
						disabled={secondaryAction.disabled}
						onClick={secondaryAction.onClick}
					>
						{secondaryAction.label}
					</Button>
				) : (
					<span />
				)}
				{primaryAction ? (
					<Button
						appearance='primary'
						disabled={primaryAction.disabled}
						onClick={primaryAction.onClick}
					>
						{primaryAction.label}
					</Button>
				) : (
					<span />
				)}
			</div>
		</div>
	);
}
