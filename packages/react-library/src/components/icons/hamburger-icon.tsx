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

function HamburgerIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='10'
			viewBox='0 0 16 10'
			fill='none'
			{...props}
		>
			<g opacity='0.5'>
				<path
					d='M0 1.25C0 0.835786 0.447715 0.5 1 0.5H15C15.5523 0.5 16 0.835786 16 1.25C16 1.66421 15.5523 2 15 2H1C0.447715 2 0 1.66421 0 1.25Z'
					fill='currentColor'
					fill-opacity='0.7'
				/>
				<path
					d='M0 5C0 4.58579 0.447715 4.25 1 4.25H15C15.5523 4.25 16 4.58579 16 5C16 5.41421 15.5523 5.75 15 5.75H1C0.447715 5.75 0 5.41421 0 5Z'
					fill='currentColor'
					fill-opacity='0.7'
				/>
				<path
					d='M0 8.75C0 8.33579 0.447715 8 1 8H15C15.5523 8 16 8.33579 16 8.75C16 9.16421 15.5523 9.5 15 9.5H1C0.447715 9.5 0 9.16421 0 8.75Z'
					fill='currentColor'
					fill-opacity='0.7'
				/>
			</g>
		</svg>
	);
}

export default HamburgerIcon;
