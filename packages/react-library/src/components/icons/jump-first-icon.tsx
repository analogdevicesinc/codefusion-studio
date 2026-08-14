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

import type {SVGProps as ReactSVGProps} from 'react';

type SVGProps = ReactSVGProps<SVGSVGElement> & {
	readonly width?: string | number;
	readonly height?: string | number;
};

/**
 * This icon looks like `|<`, used primarily for pagination controls,
 */
function JumpFirstIcon({width, height, ...props}: SVGProps) {
	return (
		<svg
			{...props}
			width={width ?? '16'}
			height={height ?? '16'}
			viewBox='0 0 16 16'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				d='M4.5 13C4.77614 13 4.99999 12.7761 5 12.5L5 3.49998C5 3.22384 4.77614 2.99998 4.5 2.99998C4.22386 2.99998 4 3.22384 4 3.49998L4 12.5C4.00001 12.7761 4.22386 13 4.5 13Z'
				fill='currentColor'
			/>
			<path
				d='M11.5039 13C11.6351 12.9988 11.7607 12.9463 11.8535 12.8535C11.9463 12.7607 11.9988 12.6351 12 12.5039C12.0011 12.3726 11.9506 12.2458 11.8594 12.1513L7.70899 7.99998L11.8594 3.84862C11.9506 3.75419 12.0011 3.62735 12 3.49608C11.9988 3.36488 11.9463 3.23925 11.8535 3.14647C11.7607 3.05367 11.6351 3.00116 11.5039 2.99998C11.3727 2.99884 11.2458 3.04941 11.1514 3.14061L6.64649 7.64647C6.55277 7.74024 6.50013 7.86741 6.5 7.99998C6.5 8.13273 6.55265 8.26059 6.64649 8.35447L11.1514 12.8594C11.2458 12.9506 11.3727 13.0011 11.5039 13Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default JumpFirstIcon;
