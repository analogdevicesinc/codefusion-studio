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

import {SVGProps} from 'react';

function CollapseAllIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M12.0127 13.4678L11.4805 14L7.97559 10.4961L4.4707 14.001L3.93848 13.4678L7.70898 9.69727H8.24219L12.0127 13.4678ZM11.9307 2.53223L8.24219 6.2207H7.70898L4.02051 2.53223L4.55371 2L7.97559 5.42188L11.3975 2L11.9307 2.53223Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default CollapseAllIcon;
