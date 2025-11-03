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

function DataFlowGasketIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='16'
			viewBox='0 0 24 24'
			fill='none'
			{...props}
		>
			<path
				fill='#CCCCCC'
				d='M12.76 1.521v15.233H15V3.75l.75-.75h6l.75.75v16.5l-.75.75h-6l-.75-.75v-1.996h-2.24v4.238h-1.5V7.243H9V20.25l-.75.75h-6l-.75-.75V3.75L2.25 3h6l.75.75v1.993h2.26V1.521h1.5ZM16.5 19.5H21v-3.99h-4.5v3.99ZM3 19.5h4.5v-3.75H3v3.75Zm0-5.25h4.5V9.985H3v4.264Zm13.5-.24H21v-4.006h-4.5v4.005Zm0-5.506H21V4.5h-4.5v4.004ZM3 8.485h4.5V4.5H3v3.985Z'
			/>
		</svg>
	);
}

export default DataFlowGasketIcon;
