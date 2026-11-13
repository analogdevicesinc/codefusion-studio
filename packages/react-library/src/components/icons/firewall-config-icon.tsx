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

export default function FirewallConfigIcon(
	props: SVGProps<SVGSVGElement>
) {
	return (
		<svg
			width='24'
			height='24'
			viewBox='12 12 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M30.6133 24.3486C30.8366 24.1729 31.1634 24.1729 31.3867 24.3486C32.5225 25.2405 34.3255 25.7459 35.501 25.8662C35.7756 25.8943 35.9999 26.1184 36 26.3945C36 26.8943 36 27.4839 36 28.4209C36 29.684 35.9616 30.9473 34.6367 32.8418C33.5678 34.3702 31.8568 35.4883 31.2354 35.8633C31.0896 35.9511 30.9104 35.9511 30.7646 35.8633C30.1432 35.4883 28.4322 34.3702 27.3633 32.8418C26.0384 30.9473 25.9999 29.684 26 28.4209C26 27.4838 26 26.8943 26 26.3945C26 26.1184 26.2244 25.8943 26.499 25.8662C27.6745 25.7459 29.48 25.2405 30.6133 24.3486Z'
				fill='currentColor'
			/>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M28 13C28.5523 13 29 13.4477 29 14V15H30.25C31.7688 15 33 16.2312 33 17.75V19H34C34.5523 19 35 19.4477 35 20C35 20.5523 34.5523 21 34 21H33V22H31.5V17.75C31.5 17.0596 30.9404 16.5 30.25 16.5H17.75C17.0596 16.5 16.5 17.0596 16.5 17.75V30.25C16.5 30.9404 17.0596 31.5 17.75 31.5H25V34C25 34.5523 24.5523 35 24 35C23.4477 35 23 34.5523 23 34V33H21V34C21 34.5523 20.5523 35 20 35C19.4477 35 19 34.5523 19 34V33H17.75C16.2312 33 15 31.7688 15 30.25V29H14C13.4477 29 13 28.5523 13 28C13 27.4477 13.4477 27 14 27H15V25H14C13.4477 25 13 24.5523 13 24C13 23.4477 13.4477 23 14 23H15V21H14C13.4477 21 13 20.5523 13 20C13 19.4477 13.4477 19 14 19H15V17.75C15 16.2312 16.2312 15 17.75 15H19V14C19 13.4477 19.4477 13 20 13C20.5523 13 21 13.4477 21 14V15H23V14C23 13.4477 23.4477 13 24 13C24.5523 13 25 13.4477 25 14V15H27V14C27 13.4477 27.4477 13 28 13Z'
				fill='currentColor'
			/>
		</svg>
	);
}
