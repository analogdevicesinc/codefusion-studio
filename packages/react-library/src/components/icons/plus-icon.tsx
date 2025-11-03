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

export default function PlusIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='16'
			height='17'
			viewBox='0 0 16 17'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				d='M13.5 7.99177V9.00823H8.47951V14H7.46721V9.00823H2.5V7.99177H7.46721V3H8.47951V7.99177H13.5Z'
				fill='currentColor'
			/>
		</svg>
	);
}
