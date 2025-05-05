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

import {VSCodePanelTab} from '@vscode/webview-ui-toolkit/react';
import {MouseEventHandler, ReactNode} from 'react';

type PanelTabProps = {
	readonly id?: string;
	readonly ariaSelected?: boolean;
	readonly testId?: string;
	readonly onClick?: MouseEventHandler<HTMLElement>;
	readonly children?: ReactNode;
};

export default function PanelTab({
	id,
	ariaSelected,
	testId,
	onClick,
	children
}: PanelTabProps) {
	return (
		<VSCodePanelTab
			id={id}
			key={id}
			aria-selected={ariaSelected}
			data-test={testId}
			onClick={onClick}
		>
			{children}
		</VSCodePanelTab>
	);
}
