/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

function WarningIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M7.60305 2H8.39695L14.5 13.4256L14.1031 14.0714H1.89695L1.5 13.4256L7.60305 2ZM8 3.19224L2.69084 13.1772H13.3092L8 3.19224ZM8.59542 12.2334V11.2895H7.40458V12.2334H8.59542ZM7.40458 10.3457V6.61993H8.59542V10.3457H7.40458Z'
				style={{
					fill: 'var(--vscode-editorWarning-foreground, #CCA700)'
				}}
			/>
		</svg>
	);
}

export default WarningIcon;
