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

export default function DisabledIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='13'
			height='13'
			viewBox='0 0 13 13'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				d='M6.5 0C10.0899 0 13 2.91015 13 6.5C13 10.0899 10.0899 13 6.5 13C2.91015 13 0 10.0899 0 6.5C0 2.91015 2.91015 0 6.5 0ZM2.98145 10.7256C3.93518 11.5206 5.16128 12 6.5 12C9.53757 12 12 9.53757 12 6.5C12 5.16128 11.5206 3.93518 10.7256 2.98145L2.98145 10.7256ZM6.5 1C3.46243 1 1 3.46243 1 6.5C1 7.83877 1.47837 9.06578 2.27344 10.0195L10.0195 2.27344C9.06578 1.47837 7.83877 1 6.5 1Z'
				fill='currentColor'
			/>
		</svg>
	);
}
