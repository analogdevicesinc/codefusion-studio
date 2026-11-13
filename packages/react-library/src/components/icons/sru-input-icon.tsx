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

import {SVGProps} from 'react';

/**
 * Direction glyph for an SRU input signal: an arrow travelling into a
 * terminating node.
 */
function SruInputIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M14.4234 12.0546L14.4234 11.2416L11.4946 8.31284L8.56589 5.38409L6.97589 6.97559L10.8909 10.9311L1.62539 10.9311L1.62539 13.1781L10.8909 13.1781L6.97589 17.1336L8.56589 18.7251L14.4234 12.8676L14.4234 12.0546ZM19.5161 15.0546C18.7205 15.0546 17.9574 14.7385 17.3948 14.1759C16.8322 13.6133 16.5161 12.8503 16.5161 12.0546C16.5161 11.259 16.8322 10.4959 17.3948 9.93328C17.9574 9.37067 18.7205 9.0546 19.5161 9.0546C20.3118 9.0546 21.0748 9.37067 21.6374 9.93328C22.2 10.4959 22.5161 11.259 22.5161 12.0546C22.5161 12.8503 22.2 13.6133 21.6374 14.1759C21.0748 14.7385 20.3118 15.0546 19.5161 15.0546Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default SruInputIcon;
