/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {VSCodeRadio} from '@vscode/webview-ui-toolkit/react';
import {ReactNode} from 'react';
import styles from './radio.module.scss';

type RadioProps = {
	readonly checked?: boolean;
	readonly slot?: string;
	readonly value?: string;
	readonly onClick?: () => void;
	readonly onChange?: ((e: Event) => unknown) &
		React.FormEventHandler<HTMLElement>;
	readonly children?: ReactNode;
};

export default function Radio({
	checked,
	slot,
	value,
	onClick,
	onChange,
	children
}: RadioProps) {
	return (
		<VSCodeRadio
			value={value}
			slot={slot}
			checked={checked}
			onChange={onChange}
			onClick={onClick}
			className={styles.radio}
		>
			{children}
		</VSCodeRadio>
	);
}
