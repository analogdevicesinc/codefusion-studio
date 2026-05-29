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

import {type SVGProps} from 'react';

function ExportIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				d='M1.5 3.50025C1.776 3.50025 2 3.72425 2 4.00025V12.0003C2 12.2763 1.776 12.5003 1.5 12.5003C1.224 12.5003 1 12.2763 1 12.0003V4.00025C1 3.72425 1.224 3.50025 1.5 3.50025ZM10.146 3.64625C10.341 3.45125 10.658 3.45125 10.853 3.64625L14.853 7.64625C15.048 7.84125 15.048 8.15825 14.853 8.35325L10.853 12.3533C10.658 12.5483 10.341 12.5483 10.146 12.3533C9.951 12.1583 9.951 11.8413 10.146 11.6463L13.293 8.50025H4.5C4.224 8.50025 4 8.27625 4 8.00025C4 7.72425 4.224 7.50025 4.5 7.50025H13.293L10.147 4.35425C9.952 4.15925 9.952 3.84225 10.147 3.64725L10.146 3.64625Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default ExportIcon;
