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
 * This icon looks like `>|`, used primarily for pagination controls,
 */
function JumpLastIcon({width, height, ...props}: SVGProps) {
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
				d='M11.5 3.00002C11.2239 3.00002 11 3.22389 11 3.50002V12.5C11 12.7762 11.2239 13 11.5 13C11.7761 13 12 12.7762 12 12.5V3.50002C12 3.22389 11.7761 3.00002 11.5 3.00002Z'
				fill='currentColor'
			/>
			<path
				d='M4.49609 3.00002C4.3649 3.00119 4.23926 3.05372 4.14648 3.1465C4.05373 3.23927 4.0012 3.36493 4 3.49611C3.99886 3.62739 4.04944 3.75423 4.14062 3.84865L8.29102 8.00002L4.14062 12.1514C4.04944 12.2458 3.99886 12.3727 4 12.5039C4.00119 12.6351 4.05372 12.7608 4.14648 12.8535C4.23926 12.9463 4.36489 12.9988 4.49609 13C4.62734 13.0012 4.75422 12.9506 4.84863 12.8594L9.35352 8.35353C9.44723 8.25976 9.49987 8.13259 9.5 8.00002C9.5 7.86727 9.44735 7.73941 9.35352 7.64553L4.84863 3.14064C4.75422 3.04944 4.62734 2.99888 4.49609 3.00002Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default JumpLastIcon;
