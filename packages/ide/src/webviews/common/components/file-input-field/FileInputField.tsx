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

import {
	TextField,
	Button,
	InfoIcon,
	Tooltip
} from 'cfs-react-library';
import styles from './FileInputField.module.scss';

type FileInputFieldProps = {
	readonly value: string;
	readonly error?: string;
	readonly label?: string;
	readonly tooltip?: string;
	readonly placeholder?: string;
	readonly browseTitle?: string;
	readonly isDisabled?: boolean;
	readonly dataTest?: string;
	readonly onInputChange: (path: string) => void;
	readonly onBrowse?: () => Promise<string | undefined>;
};

export default function FileInputField({
	value,
	error,
	label,
	tooltip,
	placeholder = 'Select file...',
	browseTitle = 'Browse',
	isDisabled = false,
	dataTest,
	onInputChange,
	onBrowse
}: FileInputFieldProps) {
	return (
		<TextField
			inputVal={value}
			label={
				<div className={styles.label}>
					{label}{' '}
					{tooltip && (
						<Tooltip title={tooltip} type='long'>
							<InfoIcon />
						</Tooltip>
					)}
				</div>
			}
			error={error}
			placeholder={placeholder}
			isDisabled={isDisabled}
			dataTest={dataTest}
			startSlot={
				<Button
					className={styles.browseButton}
					onClick={async () => {
						const res = onBrowse ? await onBrowse() : undefined;

						if (res) {
							onInputChange(res);
						}
					}}
				>
					{browseTitle}
				</Button>
			}
			onInputChange={onInputChange}
		/>
	);
}
