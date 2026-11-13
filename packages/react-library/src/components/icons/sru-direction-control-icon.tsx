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
 * Direction glyph for an SRU pin-buffer enable signal, which controls the
 * direction of a bidirectional pin: two arrows pointing opposite ways.
 */
function SruDirectionControlIcon(props: SVGProps<SVGSVGElement>) {
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
				transform='translate(3 2.25)'
				d='M14.0304 0.219679C13.7375 -0.0732263 13.2626 -0.0732263 12.9696 0.219679C12.6768 0.512569 12.6768 0.987439 12.9696 1.28033L15.4394 3.75H0.750004C0.335794 3.75 3.68617e-06 4.08579 3.68617e-06 4.5C3.68617e-06 4.91421 0.335794 5.25 0.750004 5.25H15.4394L12.9696 7.71968C12.6768 8.01257 12.6768 8.48744 12.9696 8.78033C13.2626 9.07323 13.7375 9.07323 14.0304 8.78033L17.7804 5.03033C18.0732 4.73744 18.0732 4.26257 17.7804 3.96968L14.0304 0.219679ZM5.03033 11.7803C5.32323 11.4874 5.32323 11.0126 5.03033 10.7197C4.73744 10.4268 4.26257 10.4268 3.96968 10.7197L0.219679 14.4696C-0.0732263 14.7626 -0.0732263 15.2375 0.219679 15.5304L3.96968 19.2804C4.26257 19.5732 4.73744 19.5732 5.03033 19.2804C5.32323 18.9875 5.32323 18.5126 5.03033 18.2196L2.56067 15.75H17.25C17.6642 15.75 18 15.4142 18 15C18 14.5859 17.6642 14.25 17.25 14.25H2.56067L5.03033 11.7803Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default SruDirectionControlIcon;
