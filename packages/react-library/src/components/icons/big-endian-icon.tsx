/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import React from 'react';

type BigEndianIconProps = React.SVGProps<SVGSVGElement>;

function BigEndianIcon(props: BigEndianIconProps) {
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
				d='M14 8C14 10.5 10.3137 13 7 13C3.68629 13 2 10.5417 2 8C2 5.45826 3.68629 3 7 3C10.3137 3 14 5.5 14 8Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default BigEndianIcon;
