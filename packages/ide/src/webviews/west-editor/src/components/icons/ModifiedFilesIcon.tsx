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
import type React from 'react';

/** The Modified Files badge icon; takes its color from the text around it. */
export default function ModifiedFilesIcon(
	props: React.SVGProps<SVGSVGElement>
) {
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
				d='M11 7.5C11 9.43 9.43 11 7.5 11C5.57 11 4 9.43 4 7.5C4 5.57 5.57 4 7.5 4C9.43 4 11 5.57 11 7.5ZM14 3.5V11.5C14 12.878 12.878 14 11.5 14H3.5C2.8372 13.9992 2.20178 13.7356 1.73311 13.2669C1.26444 12.7982 1.00079 12.1628 1 11.5V3.5C1 2.122 2.122 1 3.5 1H11.5C12.878 1 14 2.122 14 3.5ZM13 3.5C13 2.673 12.327 2 11.5 2H3.5C2.673 2 2 2.673 2 3.5V11.5C2 12.327 2.673 13 3.5 13H11.5C12.327 13 13 12.327 13 11.5V3.5Z'
				fill='currentColor'
			/>
		</svg>
	);
}
