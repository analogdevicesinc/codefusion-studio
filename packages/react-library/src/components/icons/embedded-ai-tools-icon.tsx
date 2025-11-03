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

function EmbeddedAiToolsIcon(props: SVGProps<SVGSVGElement>) {
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
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M7.5 9.5V14L6.5 15H2L1 14V9.5L2 8.5H6.5L7.5 9.5ZM2 14H6.5V9.5H2V14Z'
				fill='currentColor'
			/>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M15 9.5V14L14 15H9.5L8.5 14V9.5L9.5 8.5H14L15 9.5ZM9.5 14H14V9.5H9.5V14Z'
				fill='currentColor'
			/>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M7.5 2V6.5L6.5 7.5H2L1 6.5V2L2 1H6.5L7.5 2ZM2 6.5H6.5V2H2V6.5Z'
				fill='currentColor'
			/>
			<path d='M11.75 1C12.4289 2.41917 13.5808 3.57111 15 4.25C13.5808 4.92889 12.4289 6.08083 11.75 7.5C11.0711 6.08083 9.91917 4.92889 8.5 4.25C9.91917 3.57111 11.0711 2.41917 11.75 1Z' />
		</svg>
	);
}

export default EmbeddedAiToolsIcon;
