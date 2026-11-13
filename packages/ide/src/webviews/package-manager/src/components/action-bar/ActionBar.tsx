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

import type {ReactElement} from 'react';
import {Button, Tooltip} from 'cfs-react-library';
import styles from './action-bar.module.scss';

export type ActionBarAction = {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	/** Shown as a tooltip while the action is disabled. */
	disabledReason?: string;
};

/**
 * The action's button, with its disabled reason as a tooltip when it has one.
 * @param props - the button and the action it belongs to
 * @returns the button
 */
function WithDisabledReason({
	action,
	children
}: {
	readonly action: ActionBarAction;
	readonly children: ReactElement;
}) {
	return action.disabled && action.disabledReason ? (
		<Tooltip title={action.disabledReason} position='top' type='long'>
			{children}
		</Tooltip>
	) : (
		children
	);
}

export type ActionBarProps = {
	/** Left-aligned, secondary-appearance action (e.g. Back, Cancel, Ignore). */
	readonly secondaryAction?: ActionBarAction;
	/** Right-aligned, primary-appearance action (e.g. Continue, Install, Confirm). */
	readonly primaryAction?: ActionBarAction;
	/**
	 * Test-id prefix identifying which step this bar belongs to. Steps stay
	 * mounted when hidden, so several bars coexist in the DOM.
	 */
	readonly dataTest?: string;
};

export default function ActionBar({
	secondaryAction,
	primaryAction,
	dataTest = 'action-bar'
}: ActionBarProps) {
	return (
		<div className={styles.container}>
			<div className={styles.actionContainer}>
				{secondaryAction ? (
					<Button
						appearance='secondary'
						dataTest={`${dataTest}-secondary`}
						disabled={secondaryAction.disabled}
						onClick={secondaryAction.onClick}
					>
						{secondaryAction.label}
					</Button>
				) : (
					<span />
				)}
				{primaryAction ? (
					<WithDisabledReason action={primaryAction}>
						<Button
							appearance='primary'
							dataTest={`${dataTest}-primary`}
							disabled={primaryAction.disabled}
							onClick={primaryAction.onClick}
						>
							{primaryAction.label}
						</Button>
					</WithDisabledReason>
				) : (
					<span />
				)}
			</div>
		</div>
	);
}
