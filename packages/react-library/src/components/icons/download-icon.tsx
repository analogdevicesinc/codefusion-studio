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

import React from 'react';

type DownloadIconProps = React.SVGProps<SVGSVGElement>;

function DownloadIcon(props: DownloadIconProps) {
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
				d='M7.6787 11.931L3.1384 7.7931L3.7805 7.20791L7.54573 10.6395L7.54573 2L8.45379 2L8.45379 10.6395L12.219 7.20791L12.8611 7.79311L8.3208 11.931L7.6787 11.931Z'
				fill='currentColor'
			/>
			<path
				d='M13 13.1724L3 13.1724V14L13 14V13.1724Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default DownloadIcon;
