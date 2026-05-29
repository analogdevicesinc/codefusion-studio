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

export default function MCUBootIcon(props: SVGProps<SVGSVGElement>) {
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
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M12 6.25C13.5188 6.25 14.75 7.48122 14.75 9V9.25H13.25V9C13.25 8.30964 12.6904 7.75 12 7.75C11.3096 7.75 10.75 8.30964 10.75 9V10.25H16.25L16.75 10.75V16.25L16.25 16.75H7.75L7.25 16.25V10.75L7.75 10.25H9.25V9C9.25 7.48122 10.4812 6.25 12 6.25ZM8.75 15.25H15.25V11.75H8.75V15.25Z'
				fill='currentColor'
			/>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M9.5 3H11.25V0.5H12.75V3H14.5V0.5H16V3H20.2139L21 3.78613V8H23.5V9.5H21V11.25H23.5V12.75H21V14.5H23.5V16H21V20.2139L20.2139 21H16V23.5H14.5V21H12.75V23.5H11.25V21H9.5V23.5H8V21H3.78613L3 20.2139V16H0.5V14.5H3V12.75H0.5V11.25H3V9.5H0.5V8H3V3.78613L3.78613 3H8V0.5H9.5V3ZM4.57129 19.4287H19.4287V4.57129H4.57129V19.4287Z'
				fill='currentColor'
			/>
		</svg>
	);
}
