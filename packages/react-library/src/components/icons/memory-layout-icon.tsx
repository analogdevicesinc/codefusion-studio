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

function MemoryLayoutIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='16'
			viewBox='0 0 24 24'
			fill='none'
			{...props}
		>
			<path
				fill='#CCCCCC'
				d='M24 5.25v10.5l-.75.75h-1.5v3H10.787l-.208-.415-.829-1.658-.83 1.658-.207.415H2.25v-3H.75L0 15.75V5.25l.75-.75h22.5l.75.75ZM3.75 18h4.037l.75-1.5H3.75V18Zm7.963 0h8.537v-1.5h-9.287l.75 1.5ZM1.5 15h21V6h-21v9Zm5.25-6.75v4.5L6 13.5H4.5l-.75-.75v-4.5l.75-.75H6l.75.75Zm4.5 0v4.5l-.75.75H9l-.75-.75v-4.5L9 7.5h1.5l.75.75Zm4.5 0v4.5l-.75.75h-1.5l-.75-.75v-4.5l.75-.75H15l.75.75Zm4.5 0v4.5l-.75.75H18l-.75-.75v-4.5L18 7.5h1.5l.75.75Z'
			/>
		</svg>
	);
}

export default MemoryLayoutIcon;
