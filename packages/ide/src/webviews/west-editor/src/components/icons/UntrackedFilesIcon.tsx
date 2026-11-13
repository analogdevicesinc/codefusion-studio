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

/** The Untracked Files badge icon; takes its color from the text around it. */
export default function UntrackedFilesIcon(
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
				d='M11.5 1H3.5C2.8372 1.00079 2.20178 1.26444 1.73311 1.73311C1.26444 2.20178 1.00079 2.8372 1 3.5V11.5C1 12.878 2.122 14 3.5 14H11.5C12.878 14 14 12.878 14 11.5V3.5C14 2.122 12.878 1 11.5 1ZM13 11.5C13 12.327 12.327 13 11.5 13H3.5C2.673 13 2 12.327 2 11.5V3.5C2 2.673 2.673 2 3.5 2H11.5C12.327 2 13 2.673 13 3.5V11.5ZM10.854 4.146C10.9477 4.23976 11.0004 4.36692 11.0004 4.4995C11.0004 4.63208 10.9477 4.75924 10.854 4.853L4.854 10.853C4.80755 10.8996 4.75238 10.9365 4.69163 10.9617C4.63089 10.9869 4.56577 10.9999 4.5 10.9999C4.43423 10.9999 4.36911 10.9869 4.30837 10.9617C4.24762 10.9365 4.19245 10.8996 4.146 10.853C4.05226 10.7592 3.99961 10.6321 3.99961 10.4995C3.99961 10.3669 4.05226 10.2398 4.146 10.146L10.146 4.146C10.1924 4.09944 10.2476 4.06249 10.3084 4.03729C10.3691 4.01208 10.4342 3.99911 10.5 3.99911C10.5658 3.99911 10.6309 4.01208 10.6916 4.03729C10.7524 4.06249 10.8076 4.09944 10.854 4.146Z'
				fill='currentColor'
			/>
		</svg>
	);
}
