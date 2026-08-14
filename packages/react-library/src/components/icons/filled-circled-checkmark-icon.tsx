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
	readonly dataTest?: string;
};

/** A filled circle with a checkmark knocked out of it. */
export default function FilledCircledCheckmarkIcon({
	width,
	height,
	dataTest,
	...props
}: SVGProps) {
	return (
		<svg
			width={width ?? '16'}
			height={height ?? '16'}
			viewBox='0 0 14 14'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			data-test={dataTest ?? 'filled-circled-checkmark-icon'}
			{...props}
		>
			<path
				fill='currentColor'
				d='M7 0C3.14 0 0 3.14 0 7C0 10.86 3.14 14 7 14C10.86 14 14 10.86 14 7C14 3.14 10.86 0 7 0ZM10.354 5.354L6.354 9.354C6.30755 9.40056 6.25238 9.43751 6.19163 9.46271C6.13089 9.48792 6.06577 9.50089 6 9.50089C5.93423 9.50089 5.86911 9.48792 5.80837 9.46271C5.74762 9.43751 5.69245 9.40056 5.646 9.354L3.646 7.354C3.55492 7.2597 3.50452 7.1334 3.50566 7.0023C3.5068 6.8712 3.55939 6.74579 3.65209 6.65309C3.74479 6.56039 3.8702 6.5078 4.0013 6.50666C4.1324 6.50552 4.2587 6.55592 4.353 6.647L5.999 8.293L9.645 4.647C9.7393 4.55592 9.8656 4.50552 9.9967 4.50666C10.1278 4.5078 10.2532 4.56039 10.3459 4.65309C10.4386 4.74579 10.4912 4.8712 10.4923 5.0023C10.4935 5.1334 10.4431 5.2597 10.352 5.354H10.354Z'
			/>
		</svg>
	);
}
