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

function MemoryIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='13'
			viewBox='0 0 16 16'
			fill='none'
			{...props}
		>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M5.5 1.5H6.5V3.5H7.5V1.5H8.5V3.5H9.5V1.5H10.5V3.5H11.5L12.5 4.5V5.5H14.5V6.5H12.5V7.5H14.5V8.5H12.5V9.5H14.5V10.5H12.5V11.5L11.5 12.5H10.5V14.5H9.5V12.5H8.5V14.5H7.5V12.5H6.5V14.5H5.5V12.5H4.5L3.5 11.5V10.5H1.5V9.5H3.5V8.5H1.5V7.5H3.5V6.5H1.5V5.5H3.5V4.5L4.5 3.5H5.5V1.5ZM4.5 11.5H11.5V4.5H4.5V11.5Z'
				fill='#CCCCCC'
			/>
		</svg>
	);
}

export default MemoryIcon;
