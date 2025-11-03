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

function ExpandAllIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M11.9307 10.5322L8.24219 14.2207H7.70898L4.02051 10.5322L4.55371 10L7.97559 13.4219L11.3975 10L11.9307 10.5322ZM12.0127 5.46777L11.4805 6L7.97559 2.49609L4.4707 6.00098L3.93848 5.46777L7.70898 1.69727H8.24219L12.0127 5.46777Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default ExpandAllIcon;
