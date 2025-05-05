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

import {VSCodeDataGridCell} from '@vscode/webview-ui-toolkit/react';
import {DataGridCellTypes} from '../../types/components';
import {ReactNode} from 'react';

type DataGridCellProps = {
	gridColumn?: string;
	title?: string;
	key?: string;
	cellType?: DataGridCellTypes;
	dataTest?: string;
	children?: ReactNode;
	className?: string;
	onContextMenu?: React.MouseEventHandler<HTMLElement>;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
};

export default function DataGridCell({
	gridColumn,
	title,
	key,
	cellType,
	dataTest,
	children,
	className,
	onContextMenu,
	onMouseEnter,
	onMouseLeave
}: DataGridCellProps) {
	return (
		<VSCodeDataGridCell
			gridColumn={gridColumn}
			title={title}
			key={key}
			cellType={cellType}
			className={className}
			onContextMenu={onContextMenu}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			{...(dataTest ? {'data-test': dataTest} : {})}
		>
			{children}
		</VSCodeDataGridCell>
	);
}
