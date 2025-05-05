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

function GenerateIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M4.29572 5L3.48638 4.14286L0 7.63265V8.42857L3.48638 11.8571L4.29572 11.0612L1.24514 8L4.29572 5ZM12.5136 4.14286L16 7.63265V8.42857L12.5136 11.8571L11.642 11.0612L14.7549 8L11.642 5L12.5136 4.14286ZM4.54475 13.5102L10.3969 2L11.4553 2.55102L5.60311 14L4.54475 13.5102Z'
				fill='#CCCCCC'
				fill-opacity='0.7'
			/>
		</svg>
	);
}

export default GenerateIcon;
