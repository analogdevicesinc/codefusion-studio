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

type CloseIconProps = React.SVGProps<SVGSVGElement>;

function CloseIcon(props: CloseIconProps) {
	return (
		<svg
			width='16'
			height='17'
			viewBox='0 0 16 17'
			fill='currentColor'
			{...props}
		>
			<path d='M8 9.28594L12.2138 13.5L13 12.7143L8.78589 8.50001L13 4.28569L12.2139 3.5L8 7.71407L3.78614 3.5L3 4.28569L7.21411 8.50001L3.00001 12.7143L3.78616 13.5L8 9.28594Z' />
		</svg>
	);
}

export default CloseIcon;
