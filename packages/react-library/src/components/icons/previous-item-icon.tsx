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
 * This icon looks like chevron-left (`<`), but it's slightly smaller, used primarily for
 * pagination controls, specifically "previous page" button, it is smaller, to look and feel similar
 * to the jump first/last icons, which are typically `|<` and `>|`.
 */
function PreviousItemIcon({width, height, ...props}: SVGProps) {
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
				d='M9.14625 3.14638L4.64639 7.64925C4.55266 7.74307 4.5 7.87031 4.5 8.00297C4.5 8.13564 4.55266 8.26287 4.64639 8.3567L9.14625 12.85957C9.24055 12.9507 9.36684 13.00111 9.49794 12.99999C9.62903 12.99885 9.75443 12.94623 9.84714 12.85347C9.93984 12.76071 9.99242 12.63522 9.99356 12.50404C9.9947 12.37286 9.9443 12.24648 9.85323 12.15212L5.70735 8.00347L9.85323 3.85483C9.89971 3.80838 9.9366 3.75322 9.96178 3.6925C9.98697 3.63179 9.99995 3.5667 10 3.50096C10.00005 3.43522 9.98715 3.37012 9.96205 3.30936C9.93696 3.24861 9.90015 3.1934 9.85373 3.14688C9.80731 3.10036 9.75218 3.06345 9.69151 3.03825C9.63083 3.01305 9.56579 3.00006 9.50009 3.00001C9.4344 2.99996 9.36933 3.01287 9.30862 3.03798C9.24791 3.06309 9.19273 3.09993 9.14625 3.14638Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default PreviousItemIcon;
