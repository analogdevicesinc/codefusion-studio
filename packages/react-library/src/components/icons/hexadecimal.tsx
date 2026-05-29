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

function HexadecimalIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
			{...props}
		>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M5.5 2C6.88071 2 8 3.11929 8 4.5V11.5C8 12.8807 6.88071 14 5.5 14H4.5C3.11929 14 2 12.8807 2 11.5V4.5C2 3.11929 3.11929 2 4.5 2H5.5ZM4.5 3C3.67157 3 3 3.67157 3 4.5V11.5C3 12.3284 3.67157 13 4.5 13H5.5C6.32843 13 7 12.3284 7 11.5V4.5C7 3.67157 6.32843 3 5.5 3H4.5Z'
				fill='currentColor'
			/>
			<path
				d='M14.8535 8.85352L12.707 11L14.8535 13.1465L14.1465 13.8535L12 11.707L9.85352 13.8535L9.14648 13.1465L11.293 11L9.14648 8.85352L9.85352 8.14648L12 10.293L14.1465 8.14648L14.8535 8.85352Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default HexadecimalIcon;
