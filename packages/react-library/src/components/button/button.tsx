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

import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';
import {MouseEventHandler, ReactNode} from 'react';
import styles from './button.module.scss';

type ButtonProps = {
	readonly id?: string;
	readonly disabled?: boolean;
	readonly appearance?: 'primary' | 'secondary' | 'icon';
	readonly type?: 'button' | 'submit' | 'reset';
	readonly dataTest?: string;
	readonly dataValue?: number | boolean;
	readonly className?: string;
	readonly onClick?: MouseEventHandler<HTMLElement>;
	readonly children?: ReactNode;
};

export default function Button({
	id,
	disabled,
	appearance,
	type,
	dataTest,
	dataValue,
	className,
	onClick,
	children
}: ButtonProps) {
	const handleButtonClick: MouseEventHandler<HTMLElement> = event => {
		if (onClick) onClick(event);
	};
	return (
		<VSCodeButton
			id={id}
			disabled={disabled}
			type={type}
			appearance={appearance}
			{...(dataValue ? {'data-value': dataValue} : {})}
			{...(dataTest ? {'data-test': dataTest} : {})}
			className={`${className ? `${className}` : ''} ${styles.button}`}
			onClick={handleButtonClick}
		>
			{children}
		</VSCodeButton>
	);
}
