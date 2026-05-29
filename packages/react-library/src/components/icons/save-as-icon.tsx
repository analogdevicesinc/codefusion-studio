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

import {type SVGProps} from 'react';

function SaveAsIcon(props: SVGProps<SVGSVGElement>) {
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
				d='M11.687 2.30916L13.2844 3.90649L13.5935 4.62786V4.93702H13.0782L12.6145 5.40076V4.62786L11.0172 2.97901H10.708V6.84351H4.8855V2.97901H2.97901V12.666H5.8645L5.34924 13.5935H2.97901L2 12.666V2.97901L2.97901 2H11.0172L11.687 2.30916ZM7.77099 5.8645H9.72901V2.92748H7.77099V5.8645ZM14.0573 5.8645L15.5 7.30725V7.9771L9.62595 13.8511L6.68893 15.2939L6.07061 14.624L7.51336 11.7385L13.3874 5.8645H14.0573ZM8.08015 12.8206L7.56489 13.7996L8.54389 13.3359L8.08015 12.8206ZM8.69847 11.8416L9.47137 12.6145L14.4695 7.61641L13.6966 6.89504L8.69847 11.8416Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default SaveAsIcon;
