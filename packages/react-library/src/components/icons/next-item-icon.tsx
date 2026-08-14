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
 * This icon looks like chevron-right (`>`), but it's slightly smaller, used primarily for
 * pagination controls, specifically "next page" button, it is smaller, to look and feel similar
 * to the jump first/last icons, which are typically `|<` and `>|`.
 */
function NextItemIcon({width, height, ...props}: SVGProps) {
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
				d='M6.85375 3.14637L11.3536 7.64924C11.4473 7.74306 11.5 7.8703 11.5 8.00296C11.5 8.13563 11.4473 8.26286 11.3536 8.35669L6.85375 12.8596C6.75945 12.9507 6.63316 13.0011 6.50206 13C6.37097 12.9988 6.24557 12.9462 6.15286 12.8535C6.06016 12.7607 6.00758 12.6352 6.00644 12.504C6.0053 12.3728 6.0557 12.2465 6.14677 12.1521L10.2926 8.00346L6.14677 3.85482C6.10029 3.80837 6.0634 3.75321 6.03822 3.69249C6.01303 3.63178 6.00005 3.56669 6 3.50095C5.99995 3.43521 6.01285 3.37011 6.03795 3.30935C6.06304 3.2486 6.09985 3.19339 6.14627 3.14687C6.19269 3.10035 6.24782 3.06344 6.30849 3.03824C6.36917 3.01304 6.43421 3.00005 6.49991 3C6.5656 2.99995 6.63067 3.01286 6.69138 3.03797C6.75209 3.06308 6.80727 3.09992 6.85375 3.14637Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default NextItemIcon;
