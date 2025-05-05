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

import {VSCodeRadioGroup} from '@vscode/webview-ui-toolkit/react';
import {ReactNode} from 'react';
import {BoardType} from '../../types/components';

type RadioGroupProps = {
	readonly value?: BoardType;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onChange?: ((e: Event) => unknown) &
		React.FormEventHandler<HTMLElement>;
	readonly children?: ReactNode;
};

export default function RadioGroup({
	value,
	disabled,
	className,
	onChange,
	children
}: RadioGroupProps) {
	return (
		<VSCodeRadioGroup
			value={value}
			disabled={disabled}
			className={className}
			onChange={onChange}
		>
			{children}
		</VSCodeRadioGroup>
	);
}
