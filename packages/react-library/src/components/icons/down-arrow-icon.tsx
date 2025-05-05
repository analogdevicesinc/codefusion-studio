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
import {memo} from 'react';

type SVGProps = {
	readonly width?: string;
	readonly height?: string;
};

function DownArrow({width, height}: SVGProps) {
	return (
		<svg
			width={width ?? '10'}
			height={height ?? '5'}
			viewBox='0 0 10 5'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				d='M5.02674 4.14141L9.35829 -2.80501e-08L10 0.60606L5.29412 5L4.70588 5L9.27183e-07 0.60606L0.641712 -4.09064e-07L5.02674 4.14141Z'
				fill='#CCCCCC'
			/>
		</svg>
	);
}

export default memo(DownArrow);
