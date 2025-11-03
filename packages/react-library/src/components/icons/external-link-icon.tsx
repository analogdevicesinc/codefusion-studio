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

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='17'
			viewBox='0 0 16 17'
			fill='none'
			{...props}
		>
			<path
				d='M2.42857 2.50005L6.2857 2.5V3.35714L2.85714 3.35719V13.6429H13.1428V10.2143H13.9999V14.0714L13.5714 14.5H2.42857L2 14.0714V2.92862L2.42857 2.50005Z'
				fill='currentColor'
			/>
			<path
				d='M14 2.92862L14 8.5H13.1429L13.1428 3.96328L7.35085 9.75526L6.74476 9.14917L12.5367 3.35719L8 3.35719V2.50005H13.5714L14 2.92862Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default ExternalLinkIcon;
