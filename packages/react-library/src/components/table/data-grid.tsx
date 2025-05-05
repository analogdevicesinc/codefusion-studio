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
import {VSCodeDataGrid} from '@vscode/webview-ui-toolkit/react';
import {ReactNode} from 'react';

type DataGridProps = {
	gridTemplateColumns?: string;
	key?: string;
	className?: string;
	dataTest?: string;
	ariaLabel?: string;
	children?: ReactNode;
};

export default function DataGrid({
	gridTemplateColumns,
	key,
	className,
	dataTest,
	ariaLabel,
	children
}: DataGridProps) {
	return (
		<VSCodeDataGrid
			gridTemplateColumns={gridTemplateColumns}
			key={key}
			className={className}
			{...(dataTest ? {'data-test': dataTest} : {})}
			{...(ariaLabel ? {'aria-label': ariaLabel} : {})}
		>
			{children}
		</VSCodeDataGrid>
	);
}
