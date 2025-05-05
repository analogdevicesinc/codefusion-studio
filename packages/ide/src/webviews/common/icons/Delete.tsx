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

import type {SVGProps} from 'react';

export default function DeleteIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='11'
			height='13'
			viewBox='0 0 11 13'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M8 2H11V3H10V12L9 13H2L1 12V3H0V2H3V1C3 0.734784 3.10536 0.48043 3.29289 0.292893C3.48043 0.105357 3.73478 0 4 0H7C7.26522 0 7.51957 0.105357 7.70711 0.292893C7.89464 0.48043 8 0.734784 8 1V2ZM7 1H4V2H7V1ZM2 12H9V3H2V12ZM4 4H3V11H4V4ZM5 4H6V11H5V4ZM7 4H8V11H7V4Z'
				fill='currentColor'
			/>
		</svg>
	);
}
