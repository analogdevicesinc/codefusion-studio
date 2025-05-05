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

import {VSCodeDataGridRow} from '@vscode/webview-ui-toolkit/react';
import {DataGridRowTypes} from '../../types/components';
import {MutableRefObject, ReactNode} from 'react';

type DataGridRowProps = {
	id?: string;
	rowType?: DataGridRowTypes;
	key?: string;
	ref?: MutableRefObject<unknown>;
	className?: string;
	dataTest?: string;
	children?: ReactNode;
	onClick?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
};

export default function DataGridRow({
	id,
	rowType,
	key,
	className,
	dataTest,
	children,
	onClick,
	onMouseEnter,
	onMouseLeave
}: DataGridRowProps) {
	return (
		<VSCodeDataGridRow
			id={id}
			rowType={rowType}
			key={key}
			className={className}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			{...(dataTest ? {'data-test': dataTest} : {})}
		>
			{children}
		</VSCodeDataGridRow>
	);
}
