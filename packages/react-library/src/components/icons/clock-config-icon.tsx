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

function ClockConfigIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M8.64166 4.66667C8.64166 4.29848 8.35445 4 8.00016 4C7.64587 4 7.35866 4.29848 7.35866 4.66667V9.38688L9.92714 10.9122C10.2348 11.0948 10.6266 10.9838 10.8024 10.6641C10.9782 10.3444 10.8713 9.93718 10.5637 9.7545L8.64166 8.61312V4.66667Z'
				fill='#CCCCCC'
				fill-opacity='0.7'
			/>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M8.00016 0L14.6668 4V12L8.00016 16L1.3335 12V4L8.00016 0ZM2.6165 4.7698L8.00016 1.5396L13.3838 4.7698V11.2302L8.00016 14.4604L2.6165 11.2302V4.7698Z'
				fill='#CCCCCC'
				fill-opacity='0.7'
			/>
		</svg>
	);
}

export default ClockConfigIcon;
