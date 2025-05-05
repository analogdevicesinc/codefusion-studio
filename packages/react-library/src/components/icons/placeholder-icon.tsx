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

function PlaceholderIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<g clip-path='url(#clip0_8562_123242)'>
				<path
					fill-rule='evenodd'
					clip-rule='evenodd'
					d='M11.5973 12.6349C10.6039 13.4071 9.35555 13.867 7.99984 13.867C6.64412 13.867 5.39581 13.4071 4.40238 12.6349L7.99984 9.03744L11.5973 12.6349ZM12.6344 11.5978L9.03693 8.00035L12.6344 4.40286C13.4066 5.3963 13.8665 6.64461 13.8665 8.00033C13.8665 9.35605 13.4066 10.6044 12.6344 11.5978ZM11.5973 3.36577L7.99984 6.96326L4.40235 3.36577C5.39579 2.59352 6.64411 2.13366 7.99984 2.13366C9.35556 2.13366 10.6039 2.59352 11.5973 3.36577ZM3.36527 4.40287C2.59303 5.3963 2.13317 6.64461 2.13317 8.00033C2.13317 9.35605 2.59303 10.6044 3.36528 11.5978L6.96275 8.00035L3.36527 4.40287ZM15.3332 8.00033C15.3332 12.0504 12.0499 15.3337 7.99984 15.3337C3.94975 15.3337 0.666504 12.0504 0.666504 8.00033C0.666504 3.95024 3.94975 0.666992 7.99984 0.666992C12.0499 0.666992 15.3332 3.95024 15.3332 8.00033Z'
					fill='#CCCCCC'
					fill-opacity='0.7'
				/>
			</g>
			<defs>
				<clipPath id='clip0_8562_123242'>
					<rect width='16' height='16' fill='white' />
				</clipPath>
			</defs>
		</svg>
	);
}

export default PlaceholderIcon;
