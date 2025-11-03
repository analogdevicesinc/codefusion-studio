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

function CoreIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='24'
			height='25'
			viewBox='0 0 24 25'
			fill='none'
			{...props}
		>
			<path
				d='M9.5 3.5H11.25V1H12.75V3.5H14.5V1H16V3.5H20.2139L21 4.28613V8.5H23.5V10H21V11.75H23.5V13.25H21V15H23.5V16.5H21V20.7139L20.2139 21.5H16V24H14.5V21.5H12.75V24H11.25V21.5H9.5V24H8V21.5H3.78613L3 20.7139V16.5H0.5V15H3V13.25H0.5V11.75H3V10H0.5V8.5H3V4.28613L3.78613 3.5H8V1H9.5V3.5ZM4.57129 19.9287H19.4287V5.07129H4.57129V19.9287ZM16 16.5H8V8.5H16V16.5ZM9.57129 14.9287H14.4287V10.0713H9.57129V14.9287Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default CoreIcon;
