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

function DecimalIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M6 2.5V14H5V3.95605L2.39453 7.30664L1.60547 6.69336L5.10547 2.19336L6 2.5ZM12.5 4.5C12.5 3.67157 11.8284 3 11 3H10C9.17157 3 8.5 3.67157 8.5 4.5V11.5C8.5 12.3284 9.17157 13 10 13H11C11.8284 13 12.5 12.3284 12.5 11.5V4.5ZM13.5 11.5C13.5 12.8807 12.3807 14 11 14H10C8.61929 14 7.5 12.8807 7.5 11.5V4.5C7.5 3.11929 8.61929 2 10 2H11C12.3807 2 13.5 3.11929 13.5 4.5V11.5Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default DecimalIcon;
